import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';
import {
  Sparkles,
  Layers,
  Rocket,
  Zap,
  Brain,
  Download,
  ArrowRight,
  Play,
  Star,
  MessageSquare,
  GraduationCap,
  Users,
  Shield,
  FileText,
  CheckCircle,
  ChevronDown,
  Lock,
  CreditCard,
  RefreshCw,
  HelpCircle,
  Sun,
  Moon,
  Menu,
  X,
  Monitor,
} from 'lucide-react';

// ═══════════════════════════════════════════
// Animated Demo Component
// ═══════════════════════════════════════════
const DEMO_SCENARIOS = [
  {
    userMsg: 'Напиши введение для курсовой по машинному обучению',
    aiResponse: `**Введение**\n\nМашинное обучение — одно из наиболее динамично развивающихся направлений современной информатики, которое находит применение в самых разных областях...\n\n**Актуальность** данного исследования обусловлена растущей потребностью в автоматизации процессов анализа данных.\n\n**Цель работы** — изучить основные алгоритмы ML и их применимость в задачах классификации.`,
  },
  {
    userMsg: 'Помоги оформить список литературы по ГОСТ',
    aiResponse: `**Список литературы (ГОСТ Р 7.0.5-2008)**\n\n1. Иванов, А.П. Основы программирования / А.П. Иванов. — М.: Наука, 2023. — 256 с.\n\n2. Петров, В.С. Алгоритмы и структуры данных : учебное пособие / В.С. Петров, Д.И. Козлов. — СПб.: БХВ-Петербург, 2022. — 384 с.\n\n3. Smith, J. Machine Learning Fundamentals // Nature. — 2023. — Vol. 15. — P. 112–128.`,
  },
  {
    userMsg: 'Сгенерируй план дипломной работы по нейросетям',
    aiResponse: `**План дипломной работы**\n\n**Глава 1.** Теоретические основы нейронных сетей\n- 1.1 История развития нейросетевых технологий\n- 1.2 Архитектуры нейронных сетей\n\n**Глава 2.** Практическое применение\n- 2.1 Выбор инструментов и датасета\n- 2.2 Обучение и валидация модели\n\n**Глава 3.** Результаты и анализ`,
  },
];

const DemoAnimation = ({ onTryNow }: { onTryNow: () => void }) => {
  const [phase, setPhase] = useState<'idle' | 'typing-user' | 'thinking' | 'typing-ai' | 'done'>('idle');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.5 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInView && !isPlaying && phase === 'idle') {
      const t = setTimeout(() => startDemo(), 800);
      return () => clearTimeout(t);
    }
  }, [isInView]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const runTypewriter = (
    getText: () => string,
    setText: (v: string) => void,
    speed: number,
    step: number,
    onDone: () => void
  ) => {
    const tick = (idx: number) => {
      const full = getText();
      if (idx <= full.length) {
        setText(full.slice(0, idx));
        timerRef.current = setTimeout(() => tick(idx + step), speed + Math.random() * speed * 0.6);
      } else {
        onDone();
      }
    };
    tick(0);
  };

  const startDemo = () => {
    setIsPlaying(true);
    setUserText('');
    setAiText('');
    setPhase('typing-user');
    runTypewriter(
      () => DEMO_SCENARIOS[scenarioIdx].userMsg,
      setUserText,
      30, 1,
      () => {
        timerRef.current = setTimeout(() => {
          setPhase('thinking');
          timerRef.current = setTimeout(() => {
            setPhase('typing-ai');
            runTypewriter(
              () => DEMO_SCENARIOS[scenarioIdx].aiResponse,
              setAiText,
              8, 2,
              () => {
                setPhase('done');
                timerRef.current = setTimeout(() => {
                  setScenarioIdx(prev => {
                    const next = (prev + 1) % DEMO_SCENARIOS.length;
                    return next;
                  });
                  setPhase('idle');
                  setIsPlaying(false);
                  setUserText('');
                  setAiText('');
                }, 3000);
              }
            );
          }, 1200);
        }, 400);
      }
    );
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>')
        .replace(/^- (.+)/, '<span class="text-text-secondary/70">•</span> $1');
      return (
        <span key={i} className="block" dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
      );
    });
  };

  return (
    <div ref={containerRef} className="relative bg-bg-primary/50">
      {/* Fake window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-primary/50 bg-bg-secondary/30">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-bg-primary/50 border border-border-primary/30">
            <Sparkles size={12} className="text-purple-400" />
            <span className="text-text-secondary text-xs">Science AI — Чат</span>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="p-4 sm:p-6 min-h-[320px] sm:min-h-[380px] flex flex-col gap-4 overflow-hidden">
        {/* User message */}
        <AnimatePresence>
          {(phase !== 'idle') && userText && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-end">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md text-white text-sm leading-relaxed"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(168,85,247,0.85))' }}>
                {userText}
                {phase === 'typing-user' && (
                  <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="inline-block w-0.5 h-4 bg-white/80 ml-0.5 align-middle" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI thinking */}
        <AnimatePresence>
          {phase === 'thinking' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-border-primary/30 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-violet-400 animate-pulse" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-text-primary/[0.03] border border-text-primary/[0.05]">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.3, 0.9, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI response */}
        <AnimatePresence>
          {(phase === 'typing-ai' || phase === 'done') && aiText && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-border-primary/30 flex items-center justify-center shrink-0">
                <Sparkles size={14} className={`text-violet-400 ${phase === 'typing-ai' ? 'animate-pulse' : ''}`} />
              </div>
              <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md text-text-primary/80 text-sm leading-relaxed bg-text-primary/[0.025] border border-text-primary/[0.05]"
                style={{ backdropFilter: 'blur(12px)' }}>
                {renderFormattedText(aiText)}
                {phase === 'typing-ai' && (
                  <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="inline-block w-0.5 h-4 bg-violet-400/80 ml-0.5 align-middle" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle state */}
        {phase === 'idle' && !isPlaying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20">
              <Play size={28} className="text-purple-400 ml-1" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 sm:px-6 py-3 border-t border-border-primary/50 bg-bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {DEMO_SCENARIOS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === scenarioIdx ? 'bg-purple-400' : 'bg-text-primary/10'}`} />
            ))}
          </div>
          <span className="text-text-secondary/50 text-xs hidden sm:inline">
            {scenarioIdx + 1}/{DEMO_SCENARIOS.length}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onTryNow}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-medium shadow-lg shadow-purple-500/20 flex items-center gap-2"
        >
          <Sparkles size={14} />
          Попробовать
        </motion.button>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('home.pageTitle'));
  const navigate = useNavigate();
  const demoRef = useRef<HTMLDivElement>(null);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cycleTheme = () => {
    const themes = ['dark', 'light', 'midnight'];
    const currentIndex = themes.indexOf(currentTheme);
    const next = themes[(currentIndex + 1) % themes.length];
    setCurrentTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app_theme', next);
  };

  const themeIcon = currentTheme === 'dark' ? <Sun size={20} /> : currentTheme === 'light' ? <Moon size={20} /> : <Monitor size={20} />;

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Проверяем авторизацию
  useEffect(() => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const features = [
    {
      icon: Brain,
      title: t('home.featureAI'),
      description: t('home.featureAIDesc'),
      color: 'from-purple-500 to-violet-600',
    },
    {
      icon: Layers,
      title: t('home.featurePresentations'),
      description: t('home.featurePresentationsDesc'),
      color: 'from-pink-500 to-rose-600',
    },
    {
      icon: GraduationCap,
      title: t('home.featureDissertations'),
      description: t('home.featureDissertationsDesc'),
      color: 'from-blue-500 to-cyan-600',
    },
    {
      icon: Download,
      title: t('home.featureExport'),
      description: t('home.featureExportDesc'),
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: MessageSquare,
      title: t('home.featureChat'),
      description: t('home.featureChatDesc'),
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Shield,
      title: t('home.featureAntiPlagiarism'),
      description: t('home.featureAntiPlagiarismDesc'),
      color: 'from-teal-500 to-cyan-600',
    },
  ];

  // Отзывы студентов
  const testimonials = [
    { 
      name: t('home.testimonial1Name'), 
      role: t('home.testimonial1Role'), 
      text: t('home.testimonial1Text'), 
      rating: 5,
      avatar: '👩‍🎓'
    },
    { 
      name: t('home.testimonial2Name'), 
      role: t('home.testimonial2Role'), 
      text: t('home.testimonial2Text'), 
      rating: 5,
      avatar: '👨‍💻'
    },
    { 
      name: t('home.testimonial3Name'), 
      role: t('home.testimonial3Role'), 
      text: t('home.testimonial3Text'), 
      rating: 5,
      avatar: '👩‍💼'
    },
    { 
      name: t('home.testimonial4Name'), 
      role: t('home.testimonial4Role'), 
      text: t('home.testimonial4Text'), 
      rating: 5,
      avatar: '👨‍🏫'
    },
  ];

  // Статистика
  const stats = [
    { value: t('home.statStudentsValue'), label: t('home.statStudents') },
    { value: t('home.statWorksValue'), label: t('home.statWorksCreated') },
    { value: t('home.statAntiPlagValue'), label: t('home.statAntiPlagiarism') },
    { value: t('home.statAvgTimeValue'), label: t('home.statAvgTime') },
  ];

  // FAQ для снятия возражений
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = [
    { question: t('home.faq1Q'), answer: t('home.faq1A') },
    { question: t('home.faq2Q'), answer: t('home.faq2A') },
    { question: t('home.faq3Q'), answer: t('home.faq3A') },
    { question: t('home.faq4Q'), answer: t('home.faq4A') },
    { question: t('home.faq5Q'), answer: t('home.faq5A') },
  ];

  // Animated number counter component
  const AnimatedStat = ({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    const [displayValue, setDisplayValue] = useState('0');

    useEffect(() => {
      if (!isInView) return;
      // Extract numeric part and suffix (e.g., "50,000+" → 50000 & "+", "95%" → 95 & "%")
      const numMatch = value.replace(/\s/g, '').match(/^([\d,.]+)(.*)/);
      if (!numMatch) { setDisplayValue(value); return; }
      const targetNum = parseFloat(numMatch[1].replace(/,/g, ''));
      const suffix = numMatch[2] || '';
      const prefix = value.startsWith('+') ? '+' : '';
      
      if (isNaN(targetNum)) { setDisplayValue(value); return; }

      let start = 0;
      const duration = 1500;
      const startTime = performance.now() + delay;
      
      const animate = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed < 0) { requestAnimationFrame(animate); return; }
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * targetNum);
        
        // Format with locale
        const formatted = targetNum >= 1000 
          ? current.toLocaleString('ru-RU') 
          : current.toString();
        setDisplayValue(prefix + formatted + suffix);
        
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, [isInView, value, delay]);

    return (
      <div ref={ref} className="text-center">
        <div className="text-3xl md:text-4xl font-bold gradient-text">{isInView ? displayValue : '0'}</div>
        <div className="text-text-muted text-sm mt-1">{label}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 frosted-panel border-b border-white/[0.04]"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3 cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
              <Sparkles className="text-white" size={22} />
            </div>
            <span className="text-xl font-bold text-text-primary tracking-tight">Science AI</span>
          </motion.div>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={cycleTheme}
              className="p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-all duration-200"
              title={currentTheme === 'dark' ? t('home.lightTheme') : currentTheme === 'light' ? t('home.darkTheme') : t('home.lightTheme')}
              aria-label="Switch theme"
            >
              {themeIcon}
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all duration-200 text-sm font-medium"
            >
              {t('home.navPricing')}
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all duration-200 text-sm font-medium"
            >
              {t('home.navLogin')}
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/new-project')}
              className="ml-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center gap-2 text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow duration-300"
            >
              {t('home.navStartNow')}
              <ArrowRight size={16} />
            </motion.button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={cycleTheme}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
              aria-label="Switch theme"
            >
              {themeIcon}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-border-primary/50 mt-3"
            >
              <div className="py-3 space-y-1">
                <button
                  onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  {t('home.navPricing')}
                </button>
                <button
                  onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  {t('home.navLogin')}
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { navigate('/new-project'); setMobileMenuOpen(false); }}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium flex items-center justify-center gap-2 mt-2"
                >
                  <Sparkles size={18} />
                  {t('home.navStartNow')}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>



      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
        {/* Background Effects — layered for depth */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute top-[15%] left-[20%] w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[120px]"
          />
          <motion.div 
            animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute bottom-[20%] right-[15%] w-[450px] h-[450px] bg-pink-500/12 rounded-full blur-[100px]"
          />
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500/8 rounded-full blur-[140px]"
          />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full frosted-panel mb-8 floating-badge"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
              </span>
              <span className="text-sm text-text-secondary font-medium">{t('home.badge')}</span>
            </motion.div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-6 md:mb-8 leading-[1.05] tracking-tight">
              <motion.span
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-text-primary block"
              >
                {t('home.heroTitle1')}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.45, duration: 0.6 }}
                className="gradient-text block"
              >
                {t('home.heroTitle2')}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-text-primary block"
              >
                {t('home.heroTitle3')}
              </motion.span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-base md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed px-4 md:px-0"
            >
              {t('home.heroSubtitle')}
              <span className="text-purple-400 font-semibold"> {t('home.heroHighlight')}</span>{t('home.heroHighlightSuffix')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/new-project')}
                className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-4.5 rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 text-white font-bold text-base md:text-lg flex items-center justify-center gap-3 shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow duration-300 btn-ripple"
              >
                <Sparkles size={20} />
                {t('home.tryNow')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={scrollToDemo}
                className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-4.5 rounded-2xl frosted-panel text-text-primary font-bold text-base md:text-lg flex items-center justify-center gap-3 hover:border-purple-500/30 transition-all duration-300"
              >
                <Play size={20} />
                {t('home.watchDemo')}
              </motion.button>
            </motion.div>

            {/* Stats with animated counters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="mt-12 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x divide-border-primary/50"
            >
              {stats.map((stat, index) => (
                <AnimatedStat key={index} value={stat.value} label={stat.label} delay={index * 150} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-28 px-6 relative">
        {/* Section background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 mb-6"
            >
              Features
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {t('home.featuresTitle')}
              <span className="gradient-text">{t('home.featuresHighlight')}</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
              {t('home.featuresSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                whileHover={{ y: -6 }}
                className="card-premium p-6 group cursor-pointer relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-purple-300 transition-colors duration-300">{feature.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section ref={demoRef} className="py-24 px-6 bg-gradient-to-b from-bg-secondary/30 to-bg-primary">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {t('home.howItWorksTitle')}
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              {t('home.howItWorksSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8 mb-12">
            {[
              { step: '01', title: t('home.step1Title'), desc: t('home.step1Desc'), icon: FileText },
              { step: '02', title: t('home.step2Title'), desc: t('home.step2Desc'), icon: MessageSquare },
              { step: '03', title: t('home.step3Title'), desc: t('home.step3Desc'), icon: CheckCircle },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto border border-purple-500/30">
                    <item.icon size={36} className="text-purple-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">{item.title}</h3>
                <p className="text-text-secondary">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Interactive Animated Demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden border border-border-primary glass"
          >
            <DemoAnimation onTryNow={() => navigate('/auth')} />
          </motion.div>
        </div>
      </section>

      {/* Price Comparison - KILLER SECTION */}
      <section className="py-24 px-6 bg-gradient-to-b from-bg-primary to-bg-secondary/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {t('home.comparePricesTitle')}
              <span className="gradient-text">{t('home.comparePricesHighlight')}</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Фрилансер */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="card border-red-500/30 bg-red-500/5"
            >
              <div className="text-center">
                <div className="text-red-400 text-sm font-semibold mb-2">{t('home.freelancer')}</div>
                <div className="text-4xl font-bold text-red-400 mb-2">{t('home.freelancerExpensive')}</div>
                <div className="text-text-muted text-sm mb-4">{t('home.freelancerPerWork')}</div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div>{t('home.freelancerWait')}</div>
                  <div>{t('home.freelancerEdits')}</div>
                  <div>{t('home.freelancerQuality')}</div>
                  <div>{t('home.freelancerPrepay')}</div>
                </div>
              </div>
            </motion.div>

            {/* Science AI */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card border-purple-500/50 bg-purple-500/10 relative scale-105"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold">
                {t('home.recommended')}
              </div>
              <div className="text-center pt-4">
                <div className="text-purple-400 text-sm font-semibold mb-2">{t('home.scienceAI')}</div>
                <div className="text-4xl font-bold text-purple-400 mb-2">{t('home.scienceAIPrice')}</div>
                <div className="text-text-muted text-sm mb-4">{t('home.scienceAIPerMonth')}</div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div>{t('home.scienceAISpeed')}</div>
                  <div>{t('home.scienceAIEdits')}</div>
                  <div>{t('home.scienceAIAntiPlag')}</div>
                  <div>{t('home.scienceAIRefund')}</div>
                </div>
              </div>
            </motion.div>

            {/* Агентство */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="card border-red-500/30 bg-red-500/5"
            >
              <div className="text-center">
                <div className="text-red-400 text-sm font-semibold mb-2">{t('home.agency')}</div>
                <div className="text-4xl font-bold text-red-400 mb-2">{t('home.agencyPrice')}</div>
                <div className="text-text-muted text-sm mb-4">{t('home.agencyPer')}</div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div>{t('home.agencyWait')}</div>
                  <div>{t('home.agencyContract')}</div>
                  <div>{t('home.agencyDependency')}</div>
                  <div>{t('home.agencyPrepay')}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA под сравнением */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/new-project')}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-500/30"
            >
              {t('home.startForPrice')}
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {t('home.testimonialsTitle')}
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              {t('home.testimonialsSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="card-premium p-5 group"
              >
                {/* Quote mark */}
                <div className="text-4xl font-serif gradient-text opacity-30 leading-none mb-2">“</div>
                <p className="text-text-primary text-sm leading-relaxed mb-4">{item.text}</p>
                <div className="separator-gradient mb-4" />
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{item.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{item.name}</p>
                    <p className="text-xs text-text-muted truncate">{item.role}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-purple-500/[0.015] to-bg-primary pointer-events-none" />
        <div className="max-w-3xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 mb-6"
            >
              <HelpCircle size={14} />
              {t('home.faqBadge')}
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {t('home.faqTitle')}
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              {t('home.faqSubtitle')}
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ delay: index * 0.04 }}
                className={`card-premium p-5 cursor-pointer transition-all duration-300 ${openFaq === index ? 'border-purple-500/30' : ''}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenFaq(openFaq === index ? null : index); } }}
                aria-expanded={openFaq === index}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-text-primary text-[15px]">{faq.question}</h3>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown size={18} className={`transition-colors duration-200 ${openFaq === index ? 'text-purple-400' : 'text-text-muted'}`} />
                  </motion.div>
                </div>
                <div className={`accordion-content ${openFaq === index ? 'open' : ''}`}>
                  <div>
                    <p className="text-text-secondary text-sm leading-relaxed pt-3">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Shield, text: t('home.trustSSL'), color: 'text-emerald-400' },
              { icon: Lock, text: t('home.trustData'), color: 'text-blue-400' },
              { icon: RefreshCw, text: t('home.trustRefund'), color: 'text-purple-400' },
              { icon: CreditCard, text: t('home.trustPayment'), color: 'text-pink-400' },
            ].map((badge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="flex items-center justify-center gap-2.5 p-4 rounded-xl frosted-panel hover:border-purple-500/20 transition-all duration-300"
              >
                <badge.icon size={16} className={badge.color} />
                <span className="text-sm text-text-secondary font-medium">{badge.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-3xl" />
            <div className="relative glass rounded-3xl border border-border-primary p-12">
              {/* Urgency Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6"
              >
                <Zap size={16} className="text-amber-400" />
                <span className="text-sm text-amber-300">{t('home.ctaDiscount')}</span>
              </motion.div>

              <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                {t('home.ctaTitle')}
              </h2>
              <p className="text-text-secondary text-lg mb-6 max-w-2xl mx-auto">
                {t('home.ctaSubtitle')}
              </p>
              
              {/* Price highlight */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="text-5xl font-bold gradient-text">{t('home.ctaPrice')}</span>
                <span className="text-lg text-text-secondary">{t('home.ctaPriceUnit')}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/new-project')}
                className="px-10 py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-xl flex items-center justify-center gap-3 mx-auto shadow-lg shadow-purple-500/30"
              >
                <Sparkles size={24} />
                {t('home.ctaButton')}
                <ArrowRight size={24} />
              </motion.button>
              
              <p className="text-text-muted text-sm mt-4">
                {t('home.ctaGuarantee')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border-primary/50 bg-bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 md:gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Sparkles className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold text-text-primary tracking-tight">Science AI</span>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                {t('home.footerDesc')}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-text-primary mb-5 text-sm uppercase tracking-wider">{t('home.footerProduct')}</h4>
              <div className="space-y-3">
                <button onClick={() => navigate('/pricing')} className="block text-text-muted hover:text-purple-400 transition-colors text-sm">{t('home.footerPricing')}</button>
                <button onClick={scrollToDemo} className="block text-text-muted hover:text-purple-400 transition-colors text-sm">{t('home.footerHowItWorks')}</button>
                <button onClick={() => navigate('/auth')} className="block text-text-muted hover:text-purple-400 transition-colors text-sm">{t('home.footerRegister')}</button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-text-primary mb-5 text-sm uppercase tracking-wider">{t('home.footerInfo')}</h4>
              <div className="space-y-3">
                <button onClick={() => navigate('/privacy')} className="block text-text-muted hover:text-purple-400 transition-colors text-sm">{t('home.footerPrivacy')}</button>
                <button onClick={() => navigate('/terms')} className="block text-text-muted hover:text-purple-400 transition-colors text-sm">{t('home.footerTerms')}</button>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-text-primary mb-5 text-sm uppercase tracking-wider">{t('home.footerContacts')}</h4>
              <div className="space-y-3">
                <a href="mailto:support@science-ai.app" className="block text-text-muted hover:text-purple-400 transition-colors text-sm">support@science-ai.app</a>
                <p className="text-text-muted text-sm">{t('home.footerResponseTime')}</p>
              </div>
            </div>
          </div>

          <div className="separator-gradient" />
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              {t('home.footerCopyright')}
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <span className="text-xs text-text-muted">{t('home.footerSecurePayments')}</span>
              <div className="flex items-center gap-1.5">
                <div className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-text-secondary font-medium">Visa</div>
                <div className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-text-secondary font-medium">Mastercard</div>
                <div className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-text-secondary font-medium">Apple Pay</div>
                <div className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-text-secondary font-medium">Google Pay</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
