import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';
import { PageTransition } from '../components/Animations';
import { fetchWithAuth } from '../services/apiClient';
import { API_URL } from '../config';
import {
  SendIcon,
  Paperclip,
  XIcon,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Loader2,
} from 'lucide-react';

// ─── Auto-resize textarea hook ───
function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) { textarea.style.height = `${minHeight}px`; return; }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

// ─── Typing dots ───
function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-accent-primary rounded-full mx-0.5"
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 4px rgba(139, 92, 246, 0.4)' }}
        />
      ))}
    </div>
  );
}

// ─── Message type ───
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WorkspaceSetupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();

  const projectType = searchParams.get('type') || 'dissertation';
  const abortRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkspaceButton, setShowWorkspaceButton] = useState(false);
  const [workspacePath, setWorkspacePath] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 52, maxHeight: 160 });

  // Determine workspace path and initial greeting
  useEffect(() => {
    if (projectType === 'dissertation') {
      const newId = `dissertation-${Date.now()}`;
      setWorkspacePath(`/dissertation/${newId}`);
    } else {
      setWorkspacePath('/academic');
    }

    // Show initial AI greeting after short delay  
    const timer = setTimeout(() => {
      const greeting: ChatMessage = {
        id: 'greeting',
        role: 'assistant',
        content: projectType === 'dissertation'
          ? t('workspaceSetup.greetingDissertation')
          : t('workspaceSetup.greetingAcademic'),
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }, 600);
    return () => clearTimeout(timer);
  }, [projectType, t]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated || !user?.isLoggedIn) {
      navigate('/auth', { state: { redirect: `/workspace-setup?type=${projectType}` } });
    }
  }, [isAuthenticated, user, navigate, projectType]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const streamId = `msg-${Date.now() + 1}`;
    setMessages(prev => [...prev, userMsg, { id: streamId, role: 'assistant', content: '▍', timestamp: new Date() }]);
    const savedInput = input.trim();
    setInput('');
    adjustHeight(true);
    setIsLoading(true);

    try {
      abortRef.current = new AbortController();

      const contextMessages = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n\n');

      const systemPrompt = `You are Science AI, a helpful academic assistant. You're helping the user set up their ${projectType} project.
Help them define: topic, structure, key requirements, target length, deadline, and language.
Answer in the language the user writes in.
Be concise, friendly, and helpful. Use Markdown formatting.
After 2-3 exchanges when you have enough information, tell the user their workspace is ready and summarize the project plan.`;

      const response = await fetchWithAuth(`${API_URL}/ai/generate-stream`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: contextMessages
            ? `CONTEXT:\n${contextMessages}\n\nUser: ${savedInput}`
            : savedInput,
          systemPrompt,
          maxTokens: 1200,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error('API error');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullText += parsed.content;
                  setMessages(prev => prev.map(m =>
                    m.id === streamId ? { ...m, content: fullText + '▍' } : m
                  ));
                }
              } catch { /* skip non-JSON lines */ }
            }
          }
        }
      }

      // Finalize message
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, content: fullText || t('workspaceSetup.errorRetry') } : m
      ));

      // After 2+ exchanges, show workspace button
      const totalUserMessages = messages.filter(m => m.role === 'user').length + 1;
      if (totalUserMessages >= 2 || fullText.length > 500) {
        setTimeout(() => setShowWorkspaceButton(true), 800);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, content: t('workspaceSetup.errorRetry') } : m
      ));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const goToWorkspace = () => {
    setTransitioning(true);
    setTimeout(() => navigate(workspacePath), 500);
  };

  const typeIcon = projectType === 'dissertation'
    ? <GraduationCap size={20} className="text-emerald-400" />
    : <BookOpen size={20} className="text-blue-400" />;

  const typeLabel = projectType === 'dissertation' ? t('newProject.dissertationTitle') : t('newProject.academicTitle');

  return (
    <PageTransition className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* Transition overlay */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-bg-primary flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
              <p className="text-text-secondary">{t('workspaceSetup.opening')}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/8 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/8 rounded-full blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/6 rounded-full blur-[96px] animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-30 px-6 py-4 bg-bg-primary/80 backdrop-blur-xl border-b border-border-primary/50"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/new-project')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>
          <div className="flex items-center gap-2">
            {typeIcon}
            <span className="text-sm font-medium text-text-primary">{typeLabel}</span>
          </div>
          <div className="w-20" /> {/* spacer */}
        </div>
      </motion.div>

      {/* Chat area */}
      <div className="relative z-10 max-w-3xl mx-auto pt-24 pb-40 px-6 min-h-screen flex flex-col">
        {/* Welcome heading (shown before messages) */}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25"
              >
                <Sparkles size={28} className="text-white" />
              </motion.div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">{t('workspaceSetup.welcomeTitle')}</h2>
              <div className="flex items-center justify-center gap-2 text-text-muted">
                <TypingDots />
              </div>
            </motion.div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-br-md shadow-lg shadow-purple-500/20'
                      : 'bg-bg-secondary/80 backdrop-blur-sm border border-border-primary/50 text-text-primary rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Workspace button */}
          <AnimatePresence>
            {showWorkspaceButton && !transitioning && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex justify-center pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goToWorkspace}
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold text-base flex items-center gap-3 shadow-xl shadow-purple-500/30 overflow-hidden"
                >
                  {/* Shimmer */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                  <Sparkles size={20} className="relative z-10" />
                  <span className="relative z-10">{t('workspaceSetup.goToWorkspace')}</span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area (pinned to bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-6 pb-6 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
            className={`relative backdrop-blur-2xl rounded-2xl border shadow-2xl transition-all duration-300 ${
              input.trim()
                ? 'bg-bg-secondary/90 border-purple-500/30 shadow-purple-500/5'
                : 'bg-bg-secondary/60 border-border-primary/50'
            }`}
          >
            <div className="flex items-end gap-3 p-4">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
                onKeyDown={handleKeyDown}
                placeholder={t('workspaceSetup.inputPlaceholder')}
                rows={1}
                className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted/50 resize-none focus:outline-none min-h-[52px] py-3"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`flex-shrink-0 p-3 rounded-xl transition-all ${
                  input.trim()
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-bg-tertiary text-text-muted'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <SendIcon size={18} />
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Skip link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center mt-3"
          >
            <button
              onClick={goToWorkspace}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors underline underline-offset-4"
            >
              {t('workspaceSetup.skipToWorkspace')}
            </button>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default WorkspaceSetupPage;
