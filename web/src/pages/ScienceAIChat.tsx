import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useTranslation } from '../store/languageStore';
import { API_URL } from '../config';
import { fetchWithAuth } from '../services/apiClient';
import {
  Send,
  Sparkles,
  BookOpen,
  PenTool,
  Quote,
  FileText,
  Wand2,
  Command,
  Search,
  Layers,
  MessageSquare,
  GraduationCap,
  Plus,
  Trash2,
  Menu,
  X,
  Brain,
  ChevronRight,
  Hash,
  Settings,
  Paperclip,
  Image,
  File,
} from 'lucide-react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface ChatItem {
  id: string;
  title: string;
  messages: ChatMessage[];
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  taskType?: string;
  attachments?: AttachedFile[];
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface QuickAction {
  icon: typeof BookOpen;
  label: string;
  prompt: string;
}

interface CommandItem {
  icon: typeof BookOpen;
  label: string;
  description: string;
  prompt: string;
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const isImageFile = (type: string): boolean => type.startsWith('image/');

const readFileAsDataURL = (file: globalThis.File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

// ═══════════════════════════════════════════
// ScienceAIChat Component
// ═══════════════════════════════════════════
const ScienceAIChat = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const subscription = useSubscriptionStore();
  useDocumentTitle('Science AI — Чат');

  // ── State ──
  const [input, setInput] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [allChats, setAllChats] = useState<ChatItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [textareaHeight, setTextareaHeight] = useState(56);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Quick Actions ──
  const quickActions: QuickAction[] = [
    { icon: BookOpen, label: 'Написать введение', prompt: 'Напиши введение для моей диссертации' },
    { icon: PenTool, label: 'Расширить текст', prompt: 'Расширь и углуби следующий текст' },
    { icon: Wand2, label: 'Гуманизировать', prompt: 'Перепиши текст более живым, человеческим научным стилем' },
    { icon: Quote, label: 'Добавить цитаты', prompt: 'Добавь релевантные научные цитаты и ссылки на источники' },
    { icon: FileText, label: 'Заключение', prompt: 'Сгенерируй заключение для моей работы' },
  ];

  // ── Command Palette Items ──
  const commands: CommandItem[] = [
    { icon: BookOpen, label: 'Введение', description: 'Написать введение к работе', prompt: 'Напиши введение для научной работы на тему' },
    { icon: FileText, label: 'Заключение', description: 'Сгенерировать заключение', prompt: 'Напиши заключение для научной работы' },
    { icon: PenTool, label: 'Расширить', description: 'Расширить и углубить текст', prompt: 'Расширь следующий текст, добавив научную глубину:' },
    { icon: Wand2, label: 'Гуманизировать', description: 'Живой научный стиль', prompt: 'Перепиши текст более живым академическим стилем:' },
    { icon: Quote, label: 'Цитаты', description: 'Добавить научные ссылки', prompt: 'Добавь цитаты и ссылки на источники в текст:' },
    { icon: GraduationCap, label: 'Диссертация', description: 'Создать новую диссертацию', prompt: '' },
    { icon: Layers, label: 'Презентация', description: 'Создать презентацию', prompt: '' },
    { icon: Search, label: 'Найти источники', description: 'Поиск научных статей', prompt: 'Найди научные статьи и источники по теме:' },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(commandFilter.toLowerCase()) ||
    cmd.description.toLowerCase().includes(commandFilter.toLowerCase())
  );

  // ── Load chats from localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem('chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((c: Record<string, unknown>) => ({
          ...c,
          createdAt: new Date(c.createdAt as string),
          updatedAt: new Date(c.updatedAt as string),
        }));
        setAllChats(parsed);
      } catch { /* skip */ }
    }
  }, []);

  // ── Mouse tracking for glow effect ──
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Framer-powered auto-resize textarea ──
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '0px';
      const sh = inputRef.current.scrollHeight;
      const newH = Math.min(Math.max(sh, 56), 200);
      inputRef.current.style.height = newH + 'px';
      setTextareaHeight(newH);
    }
  }, [input]);

  // ── Handle "/" command detection ──
  useEffect(() => {
    if (input.startsWith('/')) {
      setShowCommandPalette(true);
      setCommandFilter(input.slice(1));
    } else {
      setShowCommandPalette(false);
      setCommandFilter('');
    }
  }, [input]);

  // ── Auto-scroll ──
  useEffect(() => {
    const endEl = messagesEndRef.current;
    const container = messagesContainerRef.current;
    if (!endEl || !container) return;
    if (isLoading) {
      endEl.scrollIntoView({ behavior: 'auto', block: 'end' });
    } else {
      const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNear) endEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  // ── Scroll detection ──
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const far = container.scrollHeight - container.scrollTop - container.clientHeight > 300;
    setShowScrollBtn(far);
  }, []);

  // ── File handling ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      const attached: AttachedFile = { name: file.name, size: file.size, type: file.type };
      if (isImageFile(file.type)) attached.preview = await readFileAsDataURL(file);
      newFiles.push(attached);
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Save chat helper ──
  const saveChat = useCallback((chatId: string, chatMessages: ChatMessage[], title?: string) => {
    const saved = localStorage.getItem('chats');
    let chats: ChatItem[] = [];
    try { chats = saved ? JSON.parse(saved) : []; } catch { chats = []; }
    const idx = chats.findIndex(c => c.id === chatId);
    const chatData: ChatItem = {
      id: chatId,
      title: title || (chatMessages[0]?.content.slice(0, 40) + '...' || 'Новый чат'),
      messages: chatMessages,
      starred: idx >= 0 ? chats[idx].starred : false,
      createdAt: idx >= 0 ? new Date(chats[idx].createdAt) : new Date(),
      updatedAt: new Date(),
    };
    if (idx >= 0) chats[idx] = chatData;
    else chats.unshift(chatData);
    localStorage.setItem('chats', JSON.stringify(chats));
    setAllChats(chats.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })));
  }, []);

  // ── Generate AI response ──
  const generateResponse = useCallback(async (
    userMessage: string,
    previousMessages: ChatMessage[],
    onChunk: (text: string) => void
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const contextMessages = previousMessages.slice(-6).map(m =>
      `${m.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${m.content}`
    ).join('\n');

    const systemPrompt = `Ты — интеллектуальный научный ассистент Science AI.
Ты помогаешь студентам и учёным с написанием диссертаций, дипломных работ, курсовых и научных статей.

Твои возможности:
• Написание и редактирование научных текстов
• Анализ и структурирование материала
• Поиск и добавление цитат
• Объяснение сложных концепций
• Помощь с методологией исследования

Правила:
- Отвечай на русском языке (если иное не указано)
- Используй академический, но понятный стиль
- Структурируй ответы с заголовками и списками
- Давай конкретные примеры
- Будь полезным и дружелюбным`;

    const userPrompt = contextMessages
      ? `КОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА:\n${contextMessages}\n\nНовое сообщение: ${userMessage}`
      : userMessage;

    const response = await fetchWithAuth(`${API_URL}/ai/generate-stream`, {
      method: 'POST',
      body: JSON.stringify({ taskType: 'chat', systemPrompt, userPrompt, temperature: 0.75, maxTokens: 3000 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Ошибка сервера (${response.status})`;
      try { const e = JSON.parse(errText); errMsg = e.error || e.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Streaming не поддерживается');

    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.content) { content += data.content; onChunk(content); }
          if (data.done && data.fullContent) content = data.fullContent;
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
        }
      }
    }
    return content;
  }, []);

  // ── Handle send ──
  const handleSend = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if ((!text && attachedFiles.length === 0) || isLoading) return;

    const remaining = subscription.getRemainingLimits();
    if (remaining.chatMessages <= 0) return;

    const chatId = currentChatId || `chat-${Date.now()}`;
    if (!currentChatId) setCurrentChatId(chatId);

    const fileNames = attachedFiles.map(f => f.name);
    const displayContent = text
      ? (fileNames.length > 0 ? `${text}\n\n📎 ${fileNames.join(', ')}` : text)
      : `📎 ${fileNames.join(', ')}`;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: displayContent,
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };

    const streamId = `msg-${Date.now() + 1}`;
    const newMessages = [...messages, userMsg];

    setMessages([...newMessages, { id: streamId, role: 'assistant', content: '▍', timestamp: new Date() }]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    subscription.incrementChatMessages();

    try {
      const response = await generateResponse(text || `Проанализируй файлы: ${fileNames.join(', ')}`, messages, (chunk) => {
        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: chunk + '▍' } : m));
      });

      const finalMsg: ChatMessage = { id: streamId, role: 'assistant', content: response, timestamp: new Date() };
      const finalMessages = [...newMessages, finalMsg];
      setMessages(finalMessages);
      saveChat(chatId, finalMessages, (text || fileNames[0] || 'Новый чат').slice(0, 40) + '...');
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: m.content.replace('▍', '') || 'Генерация отменена.' } : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== streamId));
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: `❌ ${(error as Error).message}`, timestamp: new Date() }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, currentChatId, subscription, generateResponse, saveChat, attachedFiles]);

  const handleStop = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    setIsLoading(false);
  };

  const handleQuickAction = (prompt: string) => { setInput(prompt); inputRef.current?.focus(); };

  const handleCommandSelect = (cmd: CommandItem) => {
    setShowCommandPalette(false);
    if (cmd.label === 'Диссертация') { navigate('/dissertation'); return; }
    if (cmd.label === 'Презентация') { navigate('/presentations'); return; }
    setInput(cmd.prompt + ' ');
    inputRef.current?.focus();
  };

  const openChat = (chatItem: ChatItem) => {
    setCurrentChatId(chatItem.id);
    setMessages(chatItem.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    setShowSidebar(false);
  };

  const newChat = () => { setCurrentChatId(null); setMessages([]); setInput(''); setAttachedFiles([]); setShowSidebar(false); };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = localStorage.getItem('chats');
    let chats: ChatItem[] = [];
    try { chats = saved ? JSON.parse(saved) : []; } catch { chats = []; }
    chats = chats.filter(c => c.id !== chatId);
    localStorage.setItem('chats', JSON.stringify(chats));
    setAllChats(chats.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })));
    if (currentChatId === chatId) newChat();
  };

  const filteredChats = allChats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const hasMessages = messages.length > 0;
  const hasAttachments = attachedFiles.length > 0;
  const userName = user?.name || user?.email?.split('@')[0] || 'Пользователь';

  // ═══════════════════════════════════════════
  // SHARED INPUT AREA (render function, NOT a component — avoids remount flicker)
  // ═══════════════════════════════════════════
  const renderInputArea = (isWelcome = false) => (
    <div className={isWelcome ? 'relative' : 'relative z-20 border-t border-white/[0.04] p-4'}
      style={isWelcome ? undefined : { background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(24px)' }}
    >
      <div className={isWelcome ? '' : 'max-w-3xl mx-auto'}>
        {/* Attached files */}
        <AnimatePresence>
          {hasAttachments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, i) => (
                  <motion.div
                    key={`${file.name}-${i}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="relative group"
                  >
                    {file.preview ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 relative">
                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-white/70" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                        <File size={14} className="text-violet-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-white/70 truncate max-w-[120px]">{file.name}</p>
                          <p className="text-[10px] text-white/30">{formatFileSize(file.size)}</p>
                        </div>
                        <button onClick={() => removeFile(i)} className="p-0.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input container with framer motion height animation */}
        <motion.div
          animate={{ height: textareaHeight + 24 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
          className={`relative rounded-2xl border overflow-hidden transition-colors duration-300 ${
            isFocused ? 'border-violet-500/25 shadow-[0_0_30px_rgba(139,92,246,0.06)]' : 'border-white/[0.06]'
          }`}
          style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(40px)' }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt,.csv,.rtf,.odt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Напишите запрос..."
            rows={1}
            disabled={isLoading}
            className="w-full bg-transparent text-white/90 placeholder-white/20 text-[15px] pl-14 pr-14 py-4 resize-none focus:outline-none"
            style={{ height: textareaHeight, lineHeight: '1.6', maxHeight: 200 }}
          />

          {/* Paperclip — left */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="absolute left-3.5 bottom-3.5 p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-all disabled:opacity-30"
            title="Прикрепить файл"
          >
            <Paperclip size={18} />
          </motion.button>

          {/* Send / Stop — right */}
          <div className="absolute right-3 bottom-3">
            {isLoading ? (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleStop}
                className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
                <X size={16} />
              </motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSend()}
                disabled={!input.trim() && !hasAttachments}
                className="p-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white disabled:opacity-15 disabled:cursor-not-allowed transition-opacity">
                <Send size={16} />
              </motion.button>
            )}
          </div>
        </motion.div>

        {isWelcome && (
          <div className="flex items-center justify-center gap-5 mt-3 text-white/15 text-xs">
            <span className="flex items-center gap-1"><Command size={10} />Enter — отправить</span>
            <span className="flex items-center gap-1"><Paperclip size={10} />Файлы</span>
            <span className="flex items-center gap-1"><Hash size={10} />/ — команды</span>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: '#050505' }} onMouseMove={handleMouseMove}>

      {/* ═══ SIDEBAR ═══ */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside
              initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed md:relative z-50 w-72 h-full flex flex-col border-r border-white/5"
              style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Brain size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Science AI</span>
                </div>
                <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors md:hidden">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={newChat}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 text-white/90 text-sm font-medium hover:from-violet-500/30 hover:to-fuchsia-500/30 transition-all">
                  <Plus size={16} />Новый чат
                </motion.button>
              </div>

              <div className="px-3 mb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск чатов..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/5 rounded-lg text-white/80 placeholder-white/30 focus:outline-none focus:border-violet-500/30" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
                {filteredChats.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-xs">Нет чатов</div>
                ) : filteredChats.map(chat => (
                  <motion.button key={chat.id} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }} onClick={() => openChat(chat)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-colors ${currentChatId === chat.id ? 'bg-white/10' : ''}`}>
                    <MessageSquare size={14} className="text-white/30 shrink-0" />
                    <span className="flex-1 text-sm text-white/70 truncate">{chat.title}</span>
                    <button onClick={(e) => deleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </motion.button>
                ))}
              </div>

              <div className="border-t border-white/5 p-3 space-y-1">
                <button onClick={() => navigate('/dissertation')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                  <GraduationCap size={14} />Диссертации
                </button>
                <button onClick={() => navigate('/presentations')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                  <Layers size={14} />Презентации
                </button>
                <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                  <Settings size={14} />Настройки
                </button>
              </div>

              <div className="border-t border-white/5 p-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{userName}</p>
                    <p className="text-xs text-white/30 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.025]"
            style={{ background: 'radial-gradient(circle, rgb(139 92 246), transparent 70%)' }} />
          <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.02]"
            style={{ background: 'radial-gradient(circle, rgb(99 102 241), transparent 70%)' }} />
          <div className="absolute bottom-[-20%] left-[30%] w-[600px] h-[600px] rounded-full opacity-[0.015]"
            style={{ background: 'radial-gradient(circle, rgb(217 70 239), transparent 70%)' }} />
        </div>

        {/* Mouse glow */}
        {isFocused && (
          <motion.div className="fixed pointer-events-none z-[5]"
            animate={{ x: mousePos.x - 200, y: mousePos.y - 200 }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            style={{ width: 400, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.05), rgba(217,70,239,0.025), transparent 70%)' }} />
        )}

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
              <Menu size={20} />
            </button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={newChat}
              className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors" title="Новый чат">
              <Plus size={20} />
            </motion.button>
          </div>
          <span className="text-white/20 text-sm font-light tracking-wide">Научный ИИ</span>
          <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
            <Settings size={18} />
          </button>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">

          {!hasMessages ? (
            /* ═══ WELCOME ═══ */
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                className="text-center max-w-2xl w-full">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                  className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-white/[0.04] flex items-center justify-center">
                  <Sparkles size={28} className="text-violet-400/80" />
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="text-3xl md:text-4xl font-semibold text-white/90 mb-3">
                  Чем помочь сегодня?
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-white/25 text-base mb-10">
                  Напишите запрос или используйте <span className="font-mono text-violet-400/40">/команду</span>
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="mb-10">
                  {renderInputArea(true)}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-2.5">
                  {quickActions.map((action, i) => (
                    <motion.button key={i} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.04 }}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/[0.05] text-white/35 text-sm hover:text-white/70 hover:border-white/10 hover:bg-white/[0.02] transition-all">
                      <action.icon size={14} className="text-violet-400/50" />
                      {action.label}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          ) : (
            /* ═══ CHAT ═══ */
            <>
              <div ref={messagesContainerRef} onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="max-w-3xl mx-auto space-y-5">
                  {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-white/[0.04] flex items-center justify-center shrink-0 mt-1">
                          <Sparkles size={13} className="text-violet-400/80" />
                        </div>
                      )}
                      <div className="max-w-[80%]">
                        {msg.attachments && msg.attachments.some(a => a.preview) && (
                          <div className="flex flex-wrap gap-2 mb-2 justify-end">
                            {msg.attachments.filter(a => a.preview).map((a, i) => (
                              <div key={i} className="w-28 h-28 rounded-xl overflow-hidden border border-white/10">
                                <img src={a.preview} alt={a.name} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-violet-500/90 text-white rounded-br-md'
                            : 'bg-white/[0.03] border border-white/[0.05] text-white/80 rounded-bl-md'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 mt-1 text-white/40 text-xs font-semibold">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Typing */}
                  {isLoading && messages[messages.length - 1]?.content === '▍' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-white/[0.04] flex items-center justify-center shrink-0">
                        <Sparkles size={13} className="text-violet-400 animate-pulse" />
                      </div>
                      <div className="px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] rounded-bl-md">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.2, 0.7, 0.2] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} className="h-1" />
                </div>
              </div>

              {/* Scroll FAB */}
              <AnimatePresence>
                {showScrollBtn && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/40 text-xs backdrop-blur-xl hover:bg-white/10 transition-colors">
                    ↓ Вниз
                  </motion.button>
                )}
              </AnimatePresence>

              {renderInputArea()}
            </>
          )}
        </div>

        {/* ═══ COMMAND PALETTE ═══ */}
        <AnimatePresence>
          {showCommandPalette && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-lg rounded-2xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'rgba(12,12,16,0.96)', backdropFilter: 'blur(40px)' }}>
              <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
                <Command size={14} className="text-violet-400" />
                <span className="text-sm text-white/40">Команды</span>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="text-center py-6 text-white/15 text-sm">Команда не найдена</div>
                ) : filteredCommands.map((cmd, i) => (
                  <motion.button key={i} whileHover={{ backgroundColor: 'rgba(139,92,246,0.08)' }}
                    onClick={() => handleCommandSelect(cmd)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <cmd.icon size={14} className="text-violet-400/70" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">{cmd.label}</p>
                      <p className="text-xs text-white/25">{cmd.description}</p>
                    </div>
                    <ChevronRight size={12} className="text-white/10 ml-auto" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScienceAIChat;
