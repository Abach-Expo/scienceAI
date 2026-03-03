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
  Clock,
  Layers,
  MessageSquare,
  GraduationCap,
  Plus,
  Star,
  Trash2,
  MoreHorizontal,
  Menu,
  X,
  ArrowRight,
  Brain,
  Zap,
  ChevronRight,
  Hash,
  Settings,
  LogOut,
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
}

interface QuickAction {
  icon: typeof BookOpen;
  label: string;
  prompt: string;
  gradient: string;
}

interface CommandItem {
  icon: typeof BookOpen;
  label: string;
  description: string;
  prompt: string;
}

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

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Quick Actions ──
  const quickActions: QuickAction[] = [
    { icon: BookOpen, label: 'Написать введение', prompt: 'Напиши введение для моей диссертации', gradient: 'from-violet-500 to-indigo-500' },
    { icon: PenTool, label: 'Расширить текст', prompt: 'Расширь и углуби следующий текст', gradient: 'from-indigo-500 to-blue-500' },
    { icon: Wand2, label: 'Гуманизировать', prompt: 'Перепиши текст более живым, человеческим научным стилем', gradient: 'from-fuchsia-500 to-pink-500' },
    { icon: Quote, label: 'Добавить цитаты', prompt: 'Добавь релевантные научные цитаты и ссылки на источники', gradient: 'from-purple-500 to-violet-500' },
    { icon: FileText, label: 'Заключение', prompt: 'Сгенерируй заключение для моей работы', gradient: 'from-pink-500 to-rose-500' },
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

  // ── Auto-resize textarea ──
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '60px';
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = Math.min(Math.max(scrollHeight, 60), 200) + 'px';
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
      body: JSON.stringify({
        taskType: 'chat',
        systemPrompt,
        userPrompt,
        temperature: 0.75,
        maxTokens: 3000,
      }),
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
          if (data.content) {
            content += data.content;
            onChunk(content);
          }
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
    if (!text || isLoading) return;

    // Check limits
    const remaining = subscription.getRemainingLimits();
    if (remaining.chatMessages <= 0) return;

    const chatId = currentChatId || `chat-${Date.now()}`;
    if (!currentChatId) setCurrentChatId(chatId);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const streamId = `msg-${Date.now() + 1}`;
    const newMessages = [...messages, userMsg];
    
    setMessages([...newMessages, { id: streamId, role: 'assistant', content: '▍', timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);
    subscription.incrementChatMessages();

    try {
      const response = await generateResponse(text, messages, (chunk) => {
        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: chunk + '▍' } : m));
      });

      const finalMsg: ChatMessage = { id: streamId, role: 'assistant', content: response, timestamp: new Date() };
      const finalMessages = [...newMessages, finalMsg];
      setMessages(finalMessages);
      saveChat(chatId, finalMessages, text.slice(0, 40) + (text.length > 40 ? '...' : ''));
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
  }, [input, isLoading, messages, currentChatId, subscription, generateResponse, saveChat]);

  // ── Stop generation ──
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // ── Quick action handler ──
  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // ── Command select ──
  const handleCommandSelect = (cmd: CommandItem) => {
    setShowCommandPalette(false);
    if (cmd.label === 'Диссертация') { navigate('/dissertation'); return; }
    if (cmd.label === 'Презентация') { navigate('/presentations'); return; }
    setInput(cmd.prompt + ' ');
    inputRef.current?.focus();
  };

  // ── Open existing chat ──
  const openChat = (chatItem: ChatItem) => {
    setCurrentChatId(chatItem.id);
    setMessages(chatItem.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    setShowSidebar(false);
  };

  // ── New chat ──
  const newChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInput('');
    setShowSidebar(false);
  };

  // ── Delete chat ──
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

  const filteredChats = allChats.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasMessages = messages.length > 0;
  const userName = user?.name || user?.email?.split('@')[0] || 'Пользователь';

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div 
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: '#050505' }}
      onMouseMove={handleMouseMove}
    >
      {/* ═══ SIDEBAR ═══ */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Backdrop on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed md:relative z-50 w-72 h-full flex flex-col border-r border-white/5"
              style={{ background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(20px)' }}
            >
              {/* Sidebar header */}
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

              {/* New chat button */}
              <div className="p-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={newChat}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 text-white/90 text-sm font-medium hover:from-violet-500/30 hover:to-fuchsia-500/30 transition-all"
                >
                  <Plus size={16} />
                  Новый чат
                </motion.button>
              </div>

              {/* Search */}
              <div className="px-3 mb-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск чатов..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/5 rounded-lg text-white/80 placeholder-white/30 focus:outline-none focus:border-violet-500/30"
                  />
                </div>
              </div>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
                {filteredChats.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-xs">
                    Нет чатов
                  </div>
                ) : (
                  filteredChats.map(chat => (
                    <motion.button
                      key={chat.id}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      onClick={() => openChat(chat)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-colors ${
                        currentChatId === chat.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <MessageSquare size={14} className="text-white/30 shrink-0" />
                      <span className="flex-1 text-sm text-white/70 truncate">{chat.title}</span>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.button>
                  ))
                )}
              </div>

              {/* Navigation links */}
              <div className="border-t border-white/5 p-3 space-y-1">
                <button onClick={() => navigate('/dissertation')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                  <GraduationCap size={14} />
                  Диссертации
                </button>
                <button onClick={() => navigate('/presentations')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                  <Layers size={14} />
                  Презентации
                </button>
                <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                  <Settings size={14} />
                  Настройки
                </button>
              </div>

              {/* User */}
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
        
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, rgb(139 92 246), transparent 70%)' }} />
          <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, rgb(99 102 241), transparent 70%)' }} />
          <div className="absolute bottom-[-20%] left-[30%] w-[600px] h-[600px] rounded-full opacity-[0.02]"
            style={{ background: 'radial-gradient(circle, rgb(217 70 239), transparent 70%)' }} />
        </div>

        {/* Mouse-following glow */}
        {isFocused && (
          <motion.div
            className="fixed pointer-events-none z-10"
            animate={{
              x: mousePos.x - 200,
              y: mousePos.y - 200,
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            style={{
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.06), rgba(217,70,239,0.03), transparent 70%)',
            }}
          />
        )}

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
            >
              <Menu size={18} />
            </button>
            {hasMessages && currentChatId && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={newChat}
                className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                title="Новый чат"
              >
                <Plus size={18} />
              </motion.button>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-white/30 text-xs">
            <Sparkles size={12} className="text-violet-400" />
            <span>Science AI</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          
          {!hasMessages ? (
            /* ═══ WELCOME SCREEN ═══ */
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-2xl w-full"
              >
                {/* Logo */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                  className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/5 flex items-center justify-center"
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  <Brain size={40} className="text-violet-400" />
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent mb-4"
                >
                  Чем помочь сегодня?
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/40 text-lg mb-12"
                >
                  Напишите запрос или используйте{' '}
                  <span className="text-violet-400/60 font-mono text-base">/команду</span>
                </motion.p>

                {/* Input — Welcome */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative mb-10"
                >
                  <div className={`relative rounded-2xl border transition-all duration-300 ${
                    isFocused 
                      ? 'border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.1)]' 
                      : 'border-white/[0.06]'
                  }`}
                  style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(40px)' }}
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Напишите запрос для ИИ..."
                      rows={1}
                      className="w-full bg-transparent text-white/90 placeholder-white/20 text-base px-6 py-5 pr-14 resize-none focus:outline-none min-h-[60px] max-h-[200px]"
                      style={{ lineHeight: '1.6' }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-4 bottom-4 p-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                    >
                      <Send size={16} />
                    </motion.button>
                  </div>

                  {/* Command palette hint */}
                  <div className="flex items-center justify-center gap-4 mt-3 text-white/20 text-xs">
                    <span className="flex items-center gap-1">
                      <Command size={10} />
                      Enter для отправки
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash size={10} />
                      / для команд
                    </span>
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-3"
                >
                  {quickActions.map((action, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/[0.06] text-white/50 text-sm hover:text-white/80 hover:border-white/10 transition-all group"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <action.icon size={14} className={`bg-gradient-to-r ${action.gradient} bg-clip-text text-transparent opacity-60 group-hover:opacity-100`} />
                      {action.label}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          ) : (
            /* ═══ CHAT MESSAGES ═══ */
            <>
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              >
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/5 flex items-center justify-center shrink-0 mt-1">
                          <Sparkles size={14} className="text-violet-400" />
                        </div>
                      )}
                      <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                        <div
                          className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-violet-500/90 to-fuchsia-500/90 text-white rounded-br-md'
                              : 'bg-white/[0.04] border border-white/[0.06] text-white/85 rounded-bl-md'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-1 text-white/60 text-xs font-bold">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && messages[messages.length - 1]?.content === '▍' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/5 flex items-center justify-center shrink-0">
                        <Sparkles size={14} className="text-violet-400 animate-pulse" />
                      </div>
                      <div className="px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] rounded-bl-md">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.8, 0.3] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                              className="w-2 h-2 rounded-full bg-violet-400"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} className="h-1" />
                </div>
              </div>

              {/* Scroll to bottom FAB */}
              <AnimatePresence>
                {showScrollBtn && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white/60 text-xs backdrop-blur-xl hover:bg-white/15 transition-colors"
                  >
                    ↓ Вниз
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Input — Chat mode */}
              <div className="relative z-20 border-t border-white/5 p-4" style={{ background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-3xl mx-auto">
                  <div className={`relative rounded-2xl border transition-all duration-300 ${
                    isFocused ? 'border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.08)]' : 'border-white/[0.06]'
                  }`}
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Напишите запрос..."
                      rows={1}
                      className="w-full bg-transparent text-white/90 placeholder-white/20 text-sm px-5 py-4 pr-24 resize-none focus:outline-none min-h-[52px] max-h-[160px]"
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                      {isLoading ? (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleStop}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <X size={14} />
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleSend()}
                          disabled={!input.trim()}
                          className="p-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white disabled:opacity-20 transition-opacity"
                        >
                          <Send size={14} />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══ COMMAND PALETTE ═══ */}
        <AnimatePresence>
          {showCommandPalette && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-lg rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{ background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(40px)' }}
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Command size={14} className="text-violet-400" />
                <span className="text-sm text-white/60">Команды</span>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="text-center py-6 text-white/20 text-sm">
                    Команда не найдена
                  </div>
                ) : (
                  filteredCommands.map((cmd, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ backgroundColor: 'rgba(139,92,246,0.1)' }}
                      onClick={() => handleCommandSelect(cmd)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <cmd.icon size={14} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white/80">{cmd.label}</p>
                        <p className="text-xs text-white/30">{cmd.description}</p>
                      </div>
                      <ChevronRight size={12} className="text-white/15 ml-auto" />
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScienceAIChat;
