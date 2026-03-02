import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import DOMPurify from 'dompurify';
import { API_URL } from '../config';
import { fetchWithAuth } from '../services/apiClient';
import { useSubscriptionStore } from '../store/subscriptionStore';
import {
  ArrowLeft,
  ArrowDown,
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  MoreVertical,
  Code,
  Download,
  Star,
  Lightbulb,
  BookOpen,
  Beaker,
  Calculator,
  Languages,
  ThumbsUp,
  ThumbsDown,
  StopCircle,
  Edit3,
  MessageSquare,
  PlusCircle,
  History,
  Menu,
  Search,
  Filter,
  AlertTriangle,
  Keyboard,
} from 'lucide-react';
import { useTranslation } from '../store/languageStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  taskType?: string;
  feedback?: 'up' | 'down' | null;
  isEditing?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language, t } = useTranslation();
  useDocumentTitle(t('chat.title'));
  const subscription = useSubscriptionStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth >= 768);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState('');
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load all chats for sidebar
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      try {
        setAllChats(JSON.parse(savedChats).map((c: Record<string, unknown>) => ({
          ...c,
          createdAt: new Date(c.createdAt as string),
          updatedAt: new Date(c.updatedAt as string)
        })));
      } catch { /* localStorage parse may fail - skip gracefully */ }
    }
  }, []);

  // Load or create chat
  const [chat, setChat] = useState<Chat>(() => {
    if (id) {
      const savedChats = localStorage.getItem('chats');
      if (savedChats) {
        try {
          const chats = JSON.parse(savedChats);
          const found = chats.find((c: Chat) => c.id === id);
          if (found) return { ...found, createdAt: new Date(found.createdAt), updatedAt: new Date(found.updatedAt) };
        } catch { /* localStorage parse may fail - skip gracefully */ }
      }
    }
    return {
      id: id || `chat-${Date.now()}`,
      title: t('chat.newChat'),
      messages: [],
      starred: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  // Save chat and update sidebar
  const saveChat = useCallback((chatData: Chat) => {
    const savedChats = localStorage.getItem('chats');
    let chats: Chat[] = [];
    try {
      chats = savedChats ? JSON.parse(savedChats) : [];
    } catch (e) { chats = []; }
    const index = chats.findIndex((c: Chat) => c.id === chatData.id);
    if (index >= 0) {
      chats[index] = chatData;
    } else {
      chats.unshift(chatData);
    }
    localStorage.setItem('chats', JSON.stringify(chats));
    setAllChats(chats.map((c: Chat) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt)
    })));
  }, []);

  useEffect(() => {
    saveChat(chat);
  }, [chat, saveChat]);

  // Load draft from localStorage
  useEffect(() => {
    const savedDraft = localStorage.getItem(`chat-draft-${chat.id}`);
    if (savedDraft) {
      setInput(savedDraft);
    }
  }, [chat.id]);

  // Save draft to localStorage (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (input.trim()) {
        localStorage.setItem(`chat-draft-${chat.id}`, input);
      } else {
        localStorage.removeItem(`chat-draft-${chat.id}`);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [input, chat.id]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Scroll to bottom — smooth scroll for new messages
  useEffect(() => {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [chat.messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollButton(distanceFromBottom > 200);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+O — new chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        handleNewChat();
      }
      // Ctrl+/ — toggle shortcuts panel
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsPanel(prev => !prev);
      }
      // Escape — close panels/stop generation
      if (e.key === 'Escape') {
        if (showShortcutsPanel) { setShowShortcutsPanel(false); return; }
        if (showMenu) { setShowMenu(false); return; }
        if (isLoading) { handleStop(); return; }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showShortcutsPanel, showMenu, isLoading]);

  const quickPrompts = [
    { icon: Lightbulb, text: t('chat.promptResearch'), color: 'from-yellow-500 to-orange-500', category: t('chat.categoryResearch') },
    { icon: Beaker, text: t('chat.promptScience'), color: 'from-green-500 to-emerald-500', category: t('chat.categoryScience') },
    { icon: Calculator, text: t('chat.promptMath'), color: 'from-blue-500 to-cyan-500', category: t('chat.categoryMath') },
    { icon: BookOpen, text: t('chat.promptStudy'), color: 'from-purple-500 to-pink-500', category: t('chat.categoryStudy') },
    { icon: Languages, text: t('chat.promptTranslate'), color: 'from-rose-500 to-red-500', category: t('chat.categoryLanguages') },
    { icon: Code, text: t('chat.promptCode'), color: 'from-indigo-500 to-violet-500', category: t('chat.categoryCode') },
  ];

  // ========== REAL AI API CALL (AI model routing + SSE STREAMING) ==========

  const generateAIResponse = async (
    userMessage: string, 
    previousMessages: Message[],
    onChunk?: (text: string) => void
  ): Promise<{ content: string; taskType: string }> => {
    try {
      // Build conversation context from last messages
      const contextMessages = previousMessages.slice(-6).map(m => 
        `${m.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${m.content}`
      ).join('\n\n');

      // Detect if user wants long-form content (essay, dissertation, etc.)
      const lowerMsg = userMessage.toLowerCase();
      
      // Expanded smart detection patterns for academic content routing
      const DISSERTATION_RE = /дисс?ертаци|магистерск|кандидатск|автореферат/i;
      const COURSEWORK_RE = /курсов[уюаой]|курсовая|курсовик/i;
      const REFERAT_RE = /реферат/i;
      const ESSAY_RE = /эссе|сочинени/i;
      const ARTICLE_RE = /научн\w*\s*стать|стать[юяией]\s*(для|в)\s*(журнал|вак|scopus|ринц|wos)|публикаци|journal\s*article|research\s*paper|paper\s*for\s*publication/i;
      const LONGFORM_RE = /написа[тьй]|сгенерир|на\s+\d+\s+страниц|доклад|дипломн|лабораторн|контрольн[уюаой]|отчёт|отчет|тезис[ыов]|монограф|аннотаци|рецензи|обзор\s+литератур|введение\s+к|заключение\s+к|глав[уыа]\s+\d|парагра[фф]|раздел\s+\d|write\s+(a\s+)?(paper|essay|thesis|article|report|review)|compose|draft\s+(a\s+)?/i;

      // Pick taskType based on content detection
      let taskType = 'chat';
      if (DISSERTATION_RE.test(lowerMsg)) taskType = 'dissertation';
      else if (COURSEWORK_RE.test(lowerMsg)) taskType = 'coursework';
      else if (REFERAT_RE.test(lowerMsg)) taskType = 'referat';
      else if (ARTICLE_RE.test(lowerMsg)) taskType = 'article';
      else if (ESSAY_RE.test(lowerMsg)) taskType = 'essay';
      else if (LONGFORM_RE.test(lowerMsg)) taskType = 'text_generation';

      const isLongForm = taskType !== 'chat';

      const systemPrompt = isLongForm 
        ? `Ты — Science AI, академический ассистент-писатель. Пиши как живой исследователь, а не как ИИ.

ПРАВИЛА ГЕНЕРАЦИИ ТЕКСТА:
1. Определи язык пользователя и пиши на нём
2. СРАЗУ ПИШИ ТЕКСТ. Не спрашивай уточнений, не предлагай план — генерируй академический текст
3. Используй Markdown: ## заголовки, **жирный**, *курсив*
4. Ссылайся на реальные источники с авторами и годами
5. Структура: введение, основная часть, заключение, список литературы
6. Для русскоязычных текстов — структура по ГОСТ: актуальность, цель, задачи, объект, предмет, методы
7. Объём должен соответствовать запросу. 5 страниц ≈ 10000-12000 символов

КРИТИЧНО ДЛЯ ЧЕЛОВЕЧНОСТИ (текст должен пройти проверку на ИИ):
- Чередуй ОЧЕНЬ короткие (3-7 слов) и ОЧЕНЬ длинные (30-50 слов) предложения
- НИКОГДА не начинай 2 абзаца подряд одинаково
- Начинай 5-7 предложений с "И" или "Но" — так пишут настоящие учёные
- Используй 5-8 тире (—) для вставных мыслей и пояснений
- Включай 2-3 абзаца из одного предложения для акцента
- Выражай мнение: "на наш взгляд", "мы полагаем", "данные не убеждают"
- Используй вводные: "впрочем", "пожалуй", "по-видимому", "к слову"
- НЕ используй: "Следует отметить", "В современном мире", "играет ключевую роль", "на сегодняшний день", "целый ряд", "данный подход"
- Ссылайся на свой текст: "как мы отмечали выше", "вернёмся к этому вопросу"

ЗАПРЕЩЕНО:
- Спрашивать "что именно нужно?" если запрос понятен
- Предлагать план вместо текста
- Отвечать коротко на запросы генерации
- Фразы: "Конечно!", "Отличный вопрос!", "Рад помочь!"
- Упоминать GPT, Claude, OpenAI, Anthropic`
        : `Ты — Science AI, универсальный академический ассистент.

ГЛАВНЫЕ ПРАВИЛА:
1. Определи язык пользователя и отвечай на нём
2. Если пользователь просит написать текст — СРАЗУ ПИШИ. Не спрашивай уточнений
3. Только если запрос действительно непонятен (одно слово без контекста) — попроси уточнение
4. Используй Markdown: ## заголовки, **жирный**, *курсив*, списки, таблицы, \`\`\`код\`\`\`
5. Для математики: $формула$ (inline), $$формула$$ (block)
6. Будь конкретным — сразу к сути
7. Для научных тем — ссылайся на реальные источники
8. Для задач — полное решение с объяснением каждого шага
9. Если не уверен — честно скажи

ЗАПРЕЩЕНО:
- Спрашивать "что именно нужно?" если запрос понятен
- Фразы: "Конечно!", "Отличный вопрос!", "Рад помочь!"
- Упоминать GPT, Claude, OpenAI, Anthropic`;

      const userPrompt = contextMessages 
        ? `КОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА:\n${contextMessages}\n\nНовое сообщение пользователя: ${userMessage}`
        : userMessage;

      // Create AbortController for this request
      abortControllerRef.current = new AbortController();

      // Use streaming endpoint for real-time response (fetchWithAuth auto-refreshes expired tokens)
      const response = await fetchWithAuth(`${API_URL}/ai/generate-stream`, {
        method: 'POST',
        body: JSON.stringify({
          taskType,
          systemPrompt,
          userPrompt,
          temperature: isLongForm ? 0.9 : 0.8,
          maxTokens: isLongForm ? 8000 : 3000,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = t('chat.generationError');
        try { const errData = JSON.parse(errText); errMsg = errData.error || errData.message || errMsg; } catch { /* ignore */ }
        // If still 401 after refresh attempt — session is dead, user must re-login
        if (response.status === 401) {
          errMsg = language === 'ru'
            ? 'Сессия истекла. Пожалуйста, войдите заново.'
            : 'Session expired. Please log in again.';
        }
        return { content: `⚠️ ${errMsg}`, taskType: 'chat' };
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        return { content: `⚠️ ${t('chat.serverUnavailable')}`, taskType: 'chat' };
      }

      const decoder = new TextDecoder();
      let accumulated = '';
      let fullContent = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              return { content: `⚠️ ${data.error}`, taskType: 'chat' };
            }
            if (data.content) {
              accumulated += data.content;
              onChunk?.(accumulated);
            }
            if (data.done) {
              fullContent = data.fullContent || accumulated;
            }
          } catch { /* ignore partial JSON */ }
        }
      }

      const finalContent = fullContent || accumulated;
      if (!finalContent) {
        return { content: `⚠️ ${t('chat.serverUnavailable')}`, taskType: 'chat' };
      }

      return { content: finalContent, taskType };
    } catch (error: unknown) {
      // Check if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return { content: `⏹️ ${t('chat.generationStopped')}`, taskType: 'chat' };
      }
      return { content: `❌ ${t('chat.connectionError')}`, taskType: 'chat' };
    }
  };

  // Stop generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check chat limits
    const limits = subscription.getLimits();
    const remaining = subscription.getRemainingLimits();
    if (remaining.chatMessages <= 0) {
      setLimitWarning(`${t('chat.dailyLimitReached')} (${limits.chatMessagesPerDay}/${t('chat.perDay')}). ${t('chat.upgradeToContinue')}.`);
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const streamMsgId = `msg-${Date.now() + 1}`;
    const newMessages = [...chat.messages, userMessage];
    const newTitle = chat.messages.length === 0 ? input.trim().slice(0, 40) + (input.length > 40 ? '...' : '') : chat.title;
    
    // Add user message + streaming placeholder
    setChat(prev => ({
      ...prev,
      messages: [...newMessages, {
        id: streamMsgId,
        role: 'assistant' as const,
        content: '▍',
        timestamp: new Date(),
      }],
      title: newTitle,
      updatedAt: new Date(),
    }));
    const savedInput = input.trim();
    setInput('');
    localStorage.removeItem(`chat-draft-${chat.id}`);
    setIsLoading(true);

    // Increment usage
    subscription.incrementChatMessages();

    // Generate AI response via streaming API
    try {
      const { content: aiResponse, taskType: detectedType } = await generateAIResponse(
        savedInput, 
        chat.messages,
        // onChunk callback — update streaming message in real-time
        (currentText: string) => {
          setChat(prev => ({
            ...prev,
            messages: prev.messages.map(m => 
              m.id === streamMsgId ? { ...m, content: currentText + '▍' } : m
            ),
          }));
        }
      );
      
      // Replace streaming placeholder with final content
      const finalMessage: Message = {
        id: streamMsgId,
        role: 'assistant',
        content: aiResponse,
        taskType: detectedType,
        timestamp: new Date(),
      };
      setChat(prev => ({
        ...prev,
        messages: prev.messages.map(m => 
          m.id === streamMsgId ? finalMessage : m
        ),
        updatedAt: new Date(),
      }));

      // Auto-open academic content in the workspace editor
      if (detectedType && detectedType !== 'chat' && aiResponse.length > 300) {
        // Add redirect notice to chat
        setChat(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: `msg-redirect-${Date.now()}`,
            role: 'assistant' as const,
            content: '📝 Открываю текст в рабочем пространстве...',
            timestamp: new Date(),
          }],
        }));
        // Small delay so the user sees the notice
        setTimeout(() => handleOpenInEditor(finalMessage), 1000);
      }
    } catch (error) {
      // Remove streaming placeholder on error
      setChat(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== streamMsgId),
      }));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = async (messageId: string) => {
    setRegeneratingId(messageId);
    const messageIndex = chat.messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;
    
    const userMessage = chat.messages[messageIndex - 1];
    
    try {
      const { content: newResponse, taskType: newType } = await generateAIResponse(
        userMessage.content, 
        chat.messages.slice(0, messageIndex - 1),
        // onChunk — update message in real-time during regeneration
        (currentText: string) => {
          setChat(prev => ({
            ...prev,
            messages: prev.messages.map(m => 
              m.id === messageId ? { ...m, content: currentText + '▍' } : m
            ),
          }));
        }
      );
      
      setChat(prev => ({
        ...prev,
        messages: prev.messages.map(m => 
          m.id === messageId ? { ...m, content: newResponse, taskType: newType, timestamp: new Date() } : m
        ),
        updatedAt: new Date(),
      }));
    } catch (error) {
      // error handled by UI
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      title: t('chat.newChat'),
      messages: [],
      starred: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChat(newChat);
    setInput('');
    navigate(`/chat/${newChatId}`);
  };

  // Switch to existing chat without reload
  const handleSwitchChat = (targetChat: Chat) => {
    if (targetChat.id === chat.id) return;
    setChat({
      ...targetChat,
      createdAt: new Date(targetChat.createdAt),
      updatedAt: new Date(targetChat.updatedAt),
    });
    setInput('');
    setEditingMessageId(null);
    navigate(`/chat/${targetChat.id}`);
  };

  const handleDeleteChat = (chatId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Show confirmation
    setDeleteConfirm(chatId);
  };

  const confirmDeleteChat = (chatId: string) => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      try {
        const chats = JSON.parse(savedChats).filter((c: Chat) => c.id !== chatId);
        localStorage.setItem('chats', JSON.stringify(chats));
        localStorage.removeItem(`chat-draft-${chatId}`); // Clean up draft
        setAllChats(chats.map((c: Chat) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })));
        
        if (chatId === chat.id) {
          if (chats.length > 0) {
            handleSwitchChat(chats[0]);
          } else {
            navigate('/dashboard');
          }
        }
      } catch { /* localStorage parse may fail - skip gracefully */ }
    }
    setDeleteConfirm(null);
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClearChat = () => {
    setChat(prev => ({
      ...prev,
      messages: [],
      title: t('chat.newChat'),
      updatedAt: new Date(),
    }));
    setShowMenu(false);
  };

  const handleToggleStar = () => {
    setChat(prev => ({ ...prev, starred: !prev.starred }));
    setShowMenu(false);
  };

  // Feedback on AI messages
  const handleFeedback = (messageId: string, feedback: 'up' | 'down') => {
    setChat(prev => ({
      ...prev,
      messages: prev.messages.map(m => 
        m.id === messageId 
          ? { ...m, feedback: m.feedback === feedback ? null : feedback }
          : m
      ),
    }));
    // Save feedback for analytics
    const feedbackData = JSON.parse(localStorage.getItem('chat-feedback') || '{}');
    feedbackData[messageId] = feedback;
    localStorage.setItem('chat-feedback', JSON.stringify(feedbackData));
  };

  // Edit user message
  const handleStartEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingMessageContent(message.content);
  };

  const handleSaveEditMessage = async () => {
    if (!editingMessageId || !editingMessageContent.trim()) {
      setEditingMessageId(null);
      return;
    }

    const messageIndex = chat.messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    // Update user message and remove all subsequent messages
    const updatedMessages = chat.messages.slice(0, messageIndex);
    const editedMessage: Message = {
      ...chat.messages[messageIndex],
      content: editingMessageContent.trim(),
      timestamp: new Date(),
    };
    updatedMessages.push(editedMessage);

    const streamMsgId = `msg-${Date.now()}`;
    // Add user message + streaming placeholder
    setChat(prev => ({
      ...prev,
      messages: [...updatedMessages, {
        id: streamMsgId,
        role: 'assistant' as const,
        content: '▍',
        timestamp: new Date(),
      }],
      updatedAt: new Date(),
    }));
    setEditingMessageId(null);
    setEditingMessageContent('');
    setIsLoading(true);

    // Regenerate AI response with streaming
    try {
      const { content: aiResponse, taskType: detectedType } = await generateAIResponse(
        editingMessageContent.trim(), 
        updatedMessages.slice(0, -1),
        (currentText: string) => {
          setChat(prev => ({
            ...prev,
            messages: prev.messages.map(m => 
              m.id === streamMsgId ? { ...m, content: currentText + '▍' } : m
            ),
          }));
        }
      );
      
      setChat(prev => ({
        ...prev,
        messages: prev.messages.map(m => 
          m.id === streamMsgId ? { ...m, content: aiResponse, taskType: detectedType, timestamp: new Date() } : m
        ),
        updatedAt: new Date(),
      }));
    } catch (error) {
      // error handled by UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingMessageContent('');
  };

  // Filtered chats for sidebar
  const filteredChats = allChats.filter(c => {
    const matchesSearch = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStarred = !showStarredOnly || c.starred;
    return matchesSearch && matchesStarred;
  });

  const handleQuickPrompt = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleSaveTitle = () => {
    if (newTitle.trim()) {
      setChat(prev => ({ ...prev, title: newTitle.trim() }));
    }
    setEditingTitle(false);
  };

  const handleExportChat = () => {
    const content = chat.messages.map(m => 
      `${m.role === 'user' ? `👤 ${t('chat.you')}` : '🤖 AI'}: ${m.content}`
    ).join('\n\n---\n\n');
    
    const blob = new Blob([`# ${chat.title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  // Открытие сгенерированного текста в редакторе (AcademicWorksPage)
  const handleOpenInEditor = (message: Message) => {
    const TASK_TO_DOC_TYPE: Record<string, string> = {
      dissertation: 'thesis',
      coursework: 'coursework',
      referat: 'report',
      essay: 'essay',
      text_generation: 'shortPaper',
      style_improvement: 'essay',
    };
    const docType = TASK_TO_DOC_TYPE[message.taskType || ''] || 'shortPaper';

    // Извлекаем заголовок из первой строки контента (# Заголовок)
    const titleMatch = message.content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : chat.title;

    // Парсим секции по ## заголовкам
    const sectionRegex = /^##\s+(.+)/gm;
    const sectionMatches: { title: string; start: number }[] = [];
    let match;
    while ((match = sectionRegex.exec(message.content)) !== null) {
      sectionMatches.push({ title: match[1].trim(), start: match.index });
    }

    let sections: { title: string; content: string }[];
    if (sectionMatches.length > 0) {
      sections = sectionMatches.map((sec, i) => {
        const nextStart = i < sectionMatches.length - 1 ? sectionMatches[i + 1].start : message.content.length;
        const content = message.content.slice(sec.start, nextStart).replace(/^##\s+.+\n*/, '').trim();
        return { title: sec.title, content };
      });
    } else {
      sections = [{ title: t('chat.fullText'), content: message.content }];
    }

    const docId = `chat-${Date.now()}`;
    const doc = {
      id: docId,
      type: docType,
      title,
      topic: title,
      content: message.content,
      sections,
      sources: [],
      citations: [],
      citationStyle: 'gost',
      wordCount: message.content.split(/\s+/).filter(Boolean).length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Сохраняем в localStorage (тот же формат что и AcademicWorksPage)
    const savedDocs = localStorage.getItem('academic-documents');
    const docs = savedDocs ? JSON.parse(savedDocs) : [];
    docs.push(doc);
    localStorage.setItem('academic-documents', JSON.stringify(docs));

    // Переходим в редактор
    navigate(`/academic/${docType}/${docId}`);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    if (diff < 60000) return t('chat.justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('chat.minutesShort')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('chat.hoursShort')}`;
    return new Date(date).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : language === 'zh' ? 'zh-CN' : language === 'kz' ? 'kk-KZ' : 'en-US');
  };

  const formatMessageTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString(language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : language === 'zh' ? 'zh-CN' : language === 'kz' ? 'kk-KZ' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Sanitize HTML to prevent XSS from AI-generated content
  const sanitizeHTML = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'span', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'sup', 'sub'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  };

  const renderMarkdown = (text: string) => {
    // Remove code blocks for separate rendering
    const cleanText = text.replace(/```[\s\S]*?```/g, '');
    
    return cleanText.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold mb-3 mt-4 flex items-center gap-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold mb-2 mt-3 text-purple-400">{line.slice(4)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold mb-3">{line.slice(2)}</h1>;
      }
      
      // Bold, italic, inline code, and URL links
      let processedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-sm font-mono">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors">$1</a>')
        .replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors break-all">$2</a>');
      
      // Tables
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim());
        const isHeader = i === 0 || text.split('\n')[i - 1]?.startsWith('|');
        return (
          <div key={i} className="flex border-b border-border-primary">
            {cells.map((cell, j) => (
              <div key={j} className={`flex-1 px-3 py-2 text-sm ${isHeader ? 'font-semibold bg-bg-tertiary' : ''}`}>
                {cell.trim()}
              </div>
            ))}
          </div>
        );
      }
      
      // Checkboxes
      if (line.match(/^- \[[ x]\]/)) {
        const checked = line.includes('[x]');
        const text = line.replace(/^- \[[ x]\] /, '');
        return (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 rounded border ${checked ? 'bg-purple-500 border-purple-500' : 'border-border-primary'} flex items-center justify-center`}>
              {checked && <Check size={12} className="text-white" />}
            </div>
            <span className={checked ? 'line-through text-text-muted' : ''}>{text}</span>
          </div>
        );
      }
      
      // Numbered lists
      if (line.match(/^\d+\. /)) {
        const num = line.match(/^(\d+)\./)?.[1];
        return (
          <div key={i} className="flex gap-3 mb-2 ml-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {num}
            </span>
            <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedLine.replace(/^\d+\. /, '')) }} />
          </div>
        );
      }
      
      // Bullet lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2 mb-1 ml-4">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedLine.slice(2)) }} />
          </div>
        );
      }
      
      // Blockquotes
      if (line.startsWith('>')) {
        return (
          <div key={i} className="border-l-4 border-purple-500 pl-4 py-2 my-2 bg-purple-500/10 rounded-r-lg italic">
            {line.slice(1).trim()}
          </div>
        );
      }
      
      // Horizontal rule
      if (line === '---') {
        return <hr key={i} className="my-4 border-border-primary" />;
      }
      
      // Regular paragraph
      return line.trim() ? (
        <p key={i} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(processedLine) }} />
      ) : <br key={i} />;
    });
  };

  const renderCodeBlock = (text: string) => {
    const codeBlocks = text.match(/```(\w+)?\n([\s\S]*?)```/g);
    if (!codeBlocks) return null;
    
    return codeBlocks.map((block, index) => {
      const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
      if (!match) return null;
      const [, lang, code] = match;
      const lines = code.trim().split('\n');
      
      return (
        <div key={index} className="my-4 rounded-xl overflow-hidden border border-border-primary bg-bg-tertiary group/code">
          <div className="px-4 py-2 bg-bg-secondary flex items-center justify-between border-b border-border-primary">
            <div className="flex items-center gap-2">
              <Code size={14} className="text-purple-400" />
              <span className="text-xs text-text-muted font-mono">{lang || 'code'}</span>
              <span className="text-[10px] text-text-muted/40">{lines.length} {language === 'ru' ? 'строк' : 'lines'}</span>
            </div>
            <button
              onClick={() => handleCopy(code.trim(), `code-${index}`)}
              className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-bg-tertiary rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              {copied === `code-${index}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied === `code-${index}` ? t('chat.copied') : t('chat.copy')}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className="text-sm font-mono leading-relaxed">
              {lines.map((ln, lineIdx) => (
                <div key={lineIdx} className="flex">
                  <span className="select-none text-text-muted/30 w-8 text-right mr-4 flex-shrink-0 text-xs leading-relaxed">{lineIdx + 1}</span>
                  <span className="text-text-primary">{ln}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      );
    });
  };

  return (
    <div className="h-screen bg-bg-primary flex overflow-hidden">
      {/* Limit Warning Modal */}
      <AnimatePresence>
        {limitWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setLimitWarning(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-bg-secondary border border-border-primary rounded-2xl p-6 max-w-md shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">{t('chat.limitReached')}</h3>
              </div>
              <p className="text-text-secondary mb-6">{limitWarning}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLimitWarning(null)}
                  className="flex-1 px-4 py-2 rounded-xl bg-bg-tertiary text-text-primary hover:bg-bg-primary transition-colors"
                >
                  {t('common.close')}
                </button>
                <button
                  onClick={() => { setLimitWarning(null); navigate('/pricing'); }}
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                >
                  {t('chat.upgradePlan')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-bg-secondary border border-border-primary rounded-2xl p-6 max-w-sm shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">{t('chat.deleteChat')}</h3>
              </div>
              <p className="text-text-secondary mb-6">{t('chat.deleteChatConfirm')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 rounded-xl bg-bg-tertiary text-text-primary hover:bg-bg-primary transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => confirmDeleteChat(deleteConfirm)}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - mobile backdrop */}
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        />
      )}
      
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-y-0 left-0 z-40 md:static md:z-auto border-r border-border-primary bg-bg-secondary backdrop-blur-sm flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-border-primary space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewChat}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-shadow"
              >
                <PlusCircle size={18} />
                {t('chat.newChat')}
              </motion.button>

              {/* Search + Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('chat.searchChats')}
                    className="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <button
                  onClick={() => setShowStarredOnly(!showStarredOnly)}
                  className={`p-2 rounded-lg border transition-colors ${
                    showStarredOnly 
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' 
                      : 'bg-bg-tertiary border-border-primary text-text-muted hover:text-text-primary'
                  }`}
                  title={showStarredOnly ? t('chat.showAll') : t('chat.starredOnly')}
                  aria-label={showStarredOnly ? t('chat.showAll') : t('chat.starredOnly')}
                >
                  <Star size={16} className={showStarredOnly ? 'fill-yellow-400' : ''} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
              {filteredChats.length > 0 && (
                <p className="text-[11px] text-text-muted/50 uppercase tracking-widest font-semibold px-3 py-2">
                  {showStarredOnly ? t('chat.starred') : t('chat.history')} ({filteredChats.length})
                </p>
              )}
              <div className="space-y-0.5">
                {filteredChats.map((c) => (
                  <motion.div
                    key={c.id}
                    whileHover={{ x: 2 }}
                    onClick={() => handleSwitchChat(c)}
                    className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      c.id === chat.id 
                        ? 'bg-purple-500/15 border border-purple-500/20' 
                        : 'hover:bg-bg-tertiary/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare size={14} className={`flex-shrink-0 ${c.id === chat.id ? 'text-purple-400' : 'text-text-muted/50'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${c.id === chat.id ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                          {c.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-text-muted/50">{formatTime(c.updatedAt)}</p>
                          {c.messages.length > 0 && (
                            <p className="text-[11px] text-text-muted/40">{c.messages.length} {t('chat.messagesShort')}</p>
                          )}
                        </div>
                      </div>
                      {c.starred && <Star size={11} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteChat(c.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      aria-label={t('chat.deleteThisChat')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))}
                
                {allChats.length === 0 && (
                  <div className="text-center py-8 text-text-muted/50">
                    <MessageSquare size={20} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{t('chat.noChats')}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border-primary">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                {t('chat.backToDashboard')}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 px-4 py-2.5 bg-bg-primary/90 backdrop-blur-xl border-b border-border-primary z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-bg-secondary rounded-xl transition-colors text-text-muted hover:text-text-primary"
                aria-label={t('chat.toggleSidebar')}
              >
                <Menu size={18} />
              </button>
              
              {editingTitle ? (
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="bg-bg-secondary px-3 py-1 rounded-lg border border-purple-500 focus:outline-none text-text-primary"
                  autoFocus
                />
              ) : (
                <div 
                  onClick={() => { setEditingTitle(true); setNewTitle(chat.title); }}
                  className="cursor-pointer group flex items-center gap-2"
                >
                  <h1 className="font-semibold text-text-primary flex items-center gap-2">
                    {chat.title}
                    {chat.starred && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
                  </h1>
                  <Edit3 size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted px-2 py-1 bg-bg-secondary rounded-lg">
                {chat.messages.length} {t('chat.messages')}
              </span>
              
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-bg-secondary rounded-xl transition-colors"
                  aria-label={t('chat.moreOptions')}
                >
                  <MoreVertical size={20} />
                </button>
                
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-bg-secondary border border-border-primary rounded-xl shadow-xl overflow-hidden z-50"
                    >
                      <button
                        onClick={handleToggleStar}
                        className="w-full px-4 py-3 text-left hover:bg-bg-tertiary flex items-center gap-3 transition-colors"
                      >
                        <Star size={18} className={chat.starred ? 'text-yellow-400 fill-yellow-400' : 'text-text-muted'} />
                        {chat.starred ? t('chat.removeFromFavorites') : t('chat.addToFavorites')}
                      </button>
                      <button
                        onClick={handleExportChat}
                        className="w-full px-4 py-3 text-left hover:bg-bg-tertiary flex items-center gap-3 transition-colors"
                      >
                        <Download size={18} className="text-text-muted" />
                        {t('chat.exportMarkdown')}
                      </button>
                      <div className="h-px bg-border-primary" />
                      <button
                        onClick={handleClearChat}
                        className="w-full px-4 py-3 text-left hover:bg-red-500/10 flex items-center gap-3 text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                        {t('chat.clearChat')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain" id="chat-messages-container">
          <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-full flex flex-col justify-end">
            {chat.messages.length === 0 ? (
              <div className="py-12 text-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30"
                >
                  <Sparkles size={48} className="text-white" />
                </motion.div>
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl font-bold text-text-primary mb-3"
                >
                  {t('chat.greeting')}
              </motion.h2>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-text-secondary mb-8 max-w-md mx-auto"
              >
                {t('chat.greetingSubtext')}
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto"
              >
                {quickPrompts.map((prompt, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickPrompt(prompt.text)}
                    className="p-5 rounded-2xl bg-bg-secondary border border-border-primary hover:border-purple-500/50 transition-all text-left group relative overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${prompt.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${prompt.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <prompt.icon size={24} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-text-primary mb-1">{prompt.text}</p>
                    <p className="text-xs text-text-muted">{prompt.category}</p>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="space-y-6">
              {chat.messages.map((message, msgIndex) => {
                // Date separator between messages from different days
                const prevMessage = msgIndex > 0 ? chat.messages[msgIndex - 1] : null;
                const msgDate = new Date(message.timestamp);
                const prevDate = prevMessage ? new Date(prevMessage.timestamp) : null;
                const showDateSeparator = !prevDate || 
                  msgDate.toDateString() !== prevDate.toDateString();

                const formatDateSeparator = (date: Date) => {
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  if (date.toDateString() === today.toDateString()) return language === 'ru' ? 'Сегодня' : 'Today';
                  if (date.toDateString() === yesterday.toDateString()) return language === 'ru' ? 'Вчера' : 'Yesterday';
                  return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : language === 'zh' ? 'zh-CN' : language === 'kz' ? 'kk-KZ' : 'en-US', { day: 'numeric', month: 'long' });
                };

                return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border-primary" />
                      <span className="text-[11px] text-text-muted/60 font-medium px-2">{formatDateSeparator(msgDate)}</span>
                      <div className="flex-1 h-px bg-border-primary" />
                    </div>
                  )}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(msgIndex * 0.03, 0.3) }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/20 mt-1">
                      <Bot size={18} className="text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`rounded-2xl px-5 py-3.5 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20' 
                        : `bg-bg-secondary border shadow-sm ${message.content.includes('▍') ? 'border-purple-500/40 shadow-purple-500/10' : 'border-border-primary'}`
                    } transition-colors duration-300`}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-invert max-w-none text-[15px]">
                          {regeneratingId === message.id && !message.content.includes('▍') ? (
                            <div className="flex items-center gap-2">
                              <RefreshCw size={16} className="animate-spin text-purple-400" />
                              <span className="text-text-muted">{t('chat.regenerating')}</span>
                            </div>
                          ) : (
                            <>
                              {renderMarkdown(message.content)}
                              {renderCodeBlock(message.content)}
                            </>
                          )}
                        </div>
                      ) : editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingMessageContent}
                            onChange={e => setEditingMessageContent(e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder:text-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-white/30 text-[15px]"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleCancelEditMessage}
                              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              onClick={handleSaveEditMessage}
                              className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
                            >
                              {t('chat.saveAndSend')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
                      )}
                    </div>
                    
                    {/* Timestamp + word count + action buttons */}
                    <div className={`flex items-center gap-1 mt-1.5 flex-wrap ${message.role === 'user' ? 'justify-end mr-1' : 'ml-1'}`}>
                      <span className="text-[11px] text-text-muted/60 mr-1">
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {message.role === 'assistant' && message.content.length > 200 && !message.content.includes('▍') && (
                        <span className="text-[11px] text-text-muted/40 mr-1">
                          {message.content.split(/\s+/).filter(Boolean).length} {language === 'ru' ? 'сл.' : 'words'}
                        </span>
                      )}
                      {message.role === 'assistant' && !regeneratingId && !message.content.includes('▍') && (
                        <>
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="p-1.5 hover:bg-bg-secondary rounded-lg transition-colors text-text-muted hover:text-text-primary flex items-center gap-1 text-xs"
                          title={t('chat.copy')}
                          aria-label={t('chat.copy')}
                        >
                          {copied === message.id ? (
                            <Check size={13} className="text-green-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <button 
                          onClick={() => handleRegenerate(message.id)}
                          className="p-1.5 hover:bg-bg-secondary rounded-lg transition-colors text-text-muted hover:text-text-primary text-xs"
                          title={t('chat.regenerate')}
                          aria-label={t('chat.regenerate')}
                        >
                          <RefreshCw size={13} />
                        </button>
                        {message.taskType && message.taskType !== 'chat' && message.content.length > 500 && (
                          <button
                            onClick={() => handleOpenInEditor(message)}
                            className="p-1.5 hover:bg-bg-secondary rounded-lg transition-colors text-text-muted hover:text-purple-400 flex items-center gap-1 text-xs"
                            title={t('chat.openInEditor')}
                            aria-label={t('chat.openInEditor')}
                          >
                            <Edit3 size={13} />
                            <span className="hidden sm:inline">{t('chat.toEditor')}</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleFeedback(message.id, 'up')}
                          className={`p-1.5 hover:bg-bg-secondary rounded-lg transition-colors text-xs ${
                            message.feedback === 'up' ? 'text-green-400 bg-green-500/10' : 'text-text-muted hover:text-green-400'
                          }`}
                          title={t('chat.helpfulResponse')}
                          aria-label={t('chat.helpfulResponse')}
                        >
                          <ThumbsUp size={13} className={message.feedback === 'up' ? 'fill-green-400' : ''} />
                        </button>
                        <button 
                          onClick={() => handleFeedback(message.id, 'down')}
                          className={`p-1.5 hover:bg-bg-secondary rounded-lg transition-colors text-xs ${
                            message.feedback === 'down' ? 'text-red-400 bg-red-500/10' : 'text-text-muted hover:text-red-400'
                          }`}
                          title={t('chat.unhelpfulResponse')}
                          aria-label={t('chat.unhelpfulResponse')}
                        >
                          <ThumbsDown size={13} className={message.feedback === 'down' ? 'fill-red-400' : ''} />
                        </button>
                        </>
                      )}
                      {message.role === 'user' && !editingMessageId && (
                        <button
                          onClick={() => handleStartEditMessage(message)}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white text-xs"
                          title={t('chat.editMessage')}
                          aria-label={t('chat.editMessage')}
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-9 h-9 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <User size={18} className="text-text-muted" />
                    </div>
                  )}
                </motion.div>
                </div>
                );
              })}
              
              {/* Loading indicator removed — streaming messages show ▍ cursor directly */}
            </div>
          )}
          </div>

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {showScrollButton && chat.messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={scrollToBottom}
                className="sticky bottom-4 left-1/2 -translate-x-1/2 ml-[calc(50%-20px)] w-10 h-10 rounded-full bg-purple-500/90 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center hover:bg-purple-500 transition-colors z-10"
                aria-label="Scroll to bottom"
              >
                <ArrowDown size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard shortcuts panel */}
        <AnimatePresence>
          {showShortcutsPanel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-24 right-6 bg-bg-secondary border border-border-primary rounded-2xl p-5 shadow-xl z-50 w-72"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Keyboard size={16} className="text-purple-400" />
                  {language === 'ru' ? 'Горячие клавиши' : 'Keyboard Shortcuts'}
                </h3>
                <button onClick={() => setShowShortcutsPanel(false)} className="text-text-muted hover:text-text-primary text-xs">✕</button>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { keys: 'Enter', desc: language === 'ru' ? 'Отправить сообщение' : 'Send message' },
                  { keys: 'Shift + Enter', desc: language === 'ru' ? 'Новая строка' : 'New line' },
                  { keys: 'Ctrl + Shift + O', desc: language === 'ru' ? 'Новый чат' : 'New chat' },
                  { keys: 'Ctrl + /', desc: language === 'ru' ? 'Горячие клавиши' : 'Shortcuts' },
                  { keys: 'Escape', desc: language === 'ru' ? 'Остановить / Закрыть' : 'Stop / Close' },
                ].map(s => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <span className="text-text-muted">{s.desc}</span>
                    <kbd className="px-2 py-0.5 bg-bg-tertiary border border-border-primary rounded text-[11px] text-text-secondary font-mono">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border-primary bg-bg-primary">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-bg-secondary/90 backdrop-blur-xl border border-border-primary rounded-2xl p-2 shadow-lg"
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    data-testid="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t('chat.placeholder')}
                    rows={1}
                    className="w-full px-4 py-3 bg-transparent border-none resize-none focus:outline-none text-text-primary placeholder:text-text-muted/50 text-[15px]"
                    style={{ minHeight: '48px', maxHeight: '200px' }}
                  />
                </div>
                
                <div className="flex items-center gap-1 p-1">
                  {input.length > 0 && !isLoading && (
                    <span className="text-[11px] text-text-muted/40 mr-1 tabular-nums">
                      {input.length}
                    </span>
                  )}
                  {isLoading ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStop}
                      className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                      title={t('chat.stopGeneration')}
                      aria-label={t('chat.stopGeneration')}
                    >
                      <StopCircle size={20} />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSend}
                      disabled={!input.trim()}
                      data-testid="chat-send-button"
                      className={`p-3 rounded-xl transition-all ${
                        input.trim()
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                          : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                      }`}
                      aria-label={t('chat.send')}
                    >
                      <Send size={20} />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
            
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <p className="text-[11px] text-text-muted/40">
                {t('chat.aiDisclaimer')}
              </p>
              <span className="text-text-muted/20">•</span>
              <p className="text-[11px] text-text-muted/40">
                {t('chat.newLineHint')}
              </p>
              <span className="text-text-muted/20">•</span>
              <p className="text-[11px] text-text-muted/40">
                {subscription.getRemainingLimits().chatMessages}/{subscription.getLimits().chatMessagesPerDay} {t('chat.messagesToday')}
              </p>
              <span className="text-text-muted/20">•</span>
              <button
                onClick={() => setShowShortcutsPanel(prev => !prev)}
                className="text-[11px] text-text-muted/40 hover:text-purple-400 transition-colors flex items-center gap-1"
              >
                <Keyboard size={10} />
                <span>Ctrl + /</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
