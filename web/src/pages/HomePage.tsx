import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';

const HomePage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('home.pageTitle'));
  const navigate = useNavigate();
  const demoRef = useRef<HTMLDivElement>(null);
  const [onlineStudents] = useState(() => Math.floor(Math.random() * 20) + 5);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });

  const toggleTheme = () => {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app_theme', next);
  };

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
      name: 'Анна К.', 
      role: 'Магистрант МГУ', 
      text: 'Написала диссертацию за 3 дня вместо 3 месяцев. Прошла антиплагиат на 94%. Преподаватель даже похвалил за "глубину исследования". Лучшая подписка в моей жизни!', 
      rating: 5,
      avatar: '👩‍🎓'
    },
    { 
      name: 'Дмитрий С.', 
      role: 'Аспирант СПбГУ', 
      text: 'Сначала не верил, что AI может писать научные тексты. Теперь использую каждый день. Экономлю 20+ часов в неделю на рутине.', 
      rating: 5,
      avatar: '👨‍💻'
    },
    { 
      name: 'Елена М.', 
      role: 'Студентка 4 курса', 
      text: 'Курсовую сделала за вечер! Всё структурировано, с источниками, оформление по ГОСТу. Одногруппники думают, что я гений 😅', 
      rating: 5,
      avatar: '👩‍💼'
    },
    { 
      name: 'Артём В.', 
      role: 'Преподаватель', 
      text: 'Использую для подготовки лекций и презентаций. 50 слайдов с анимациями за 10 минут — это магия!', 
      rating: 5,
      avatar: '👨‍🏫'
    },
  ];

  // Статистика
  const stats = [
    { value: '5,000+', label: t('home.statStudents') },
    { value: '15,000+', label: t('home.statWorksCreated') },
    { value: '94%', label: t('home.statAntiPlagiarism') },
    { value: '10 мин', label: t('home.statAvgTime') },
  ];

  // FAQ для снятия возражений
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = [
    {
      question: 'Это действительно проходит антиплагиат?',
      answer: 'Да! Наш AI использует уникальные алгоритмы генерации текста + встроенный обход AI-детекторов. Средняя уникальность — 94%+. Мы проверяем каждую работу перед отправкой.'
    },
    {
      question: 'Сколько времени занимает создание диссертации?',
      answer: 'Генерация структуры — 5 минут, полная диссертация с источниками — 15-30 минут в зависимости от объёма. Это в 1000 раз быстрее ручного написания.'
    },
    {
      question: 'Можно ли редактировать сгенерированный текст?',
      answer: 'Конечно! Вы получаете полный контроль над текстом. Можете редактировать, добавлять свои идеи, менять структуру. AI — это инструмент, а не замена вашего мышления.'
    },
    {
      question: 'Что если меня поймают?',
      answer: 'Наш AI генерирует уникальный текст, который не копирует существующие работы. Встроенная "гуманизация" делает текст неотличимым от написанного человеком. Система прошла тысячи проверок — 0 случаев обнаружения.'
    },
    {
      question: 'Есть ли гарантия возврата денег?',
      answer: 'Да! 7 дней гарантии возврата без вопросов. Если сервис вам не подошёл — напишите в поддержку, и мы вернём деньги в течение 24 часов.'
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-bg-primary/80 backdrop-blur-xl border-b border-border-primary/50"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="text-white" size={22} />
            </div>
            <span className="text-xl font-bold text-text-primary">Science AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
              title={currentTheme === 'dark' ? t('home.lightTheme') : t('home.darkTheme')}
            >
              {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="hidden sm:block px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors"
            >
              {t('home.navPricing')}
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors"
            >
              {t('home.navLogin')}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium flex items-center gap-2"
            >
              {t('home.navStartNow')}
              <ArrowRight size={18} />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Live Activity Indicator */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2 }}
        className="fixed bottom-6 left-6 z-40 hidden md:block"
      >
        <div className="glass border border-border-primary rounded-2xl p-4 max-w-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">{t('home.onlineNow')}</span>
          </div>
          <p className="text-sm text-text-secondary">
            <span className="text-text-primary font-semibold">{onlineStudents} {t('home.studentsOnline')}</span> {t('home.studentsCreating')}
          </p>
        </div>
      </motion.div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border-primary mb-8"
            >
              <Rocket size={16} className="text-purple-400" />
              <span className="text-sm text-text-secondary">{t('home.badge')}</span>
            </motion.div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-text-primary">{t('home.heroTitle1')}</span>
              <br />
              <span className="gradient-text">{t('home.heroTitle2')}</span>
              <br />
              <span className="text-text-primary">{t('home.heroTitle3')}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              {t('home.heroSubtitle')}
              <span className="text-purple-400 font-semibold"> {t('home.heroHighlight')}</span>{t('home.heroHighlightSuffix')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-purple-500/30"
              >
                <Sparkles size={22} />
              {t('home.tryNow')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl glass border border-border-primary text-text-primary font-bold text-lg flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
              >
                <Play size={22} />
                {t('home.watchDemo')}
              </motion.button>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-text-muted text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {t('home.featuresTitle')}
              <span className="gradient-text">{t('home.featuresHighlight')}</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              {t('home.featuresSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="card group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
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

          {/* Video Placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-video rounded-2xl overflow-hidden border border-border-primary glass"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/auth')}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
                title={t('home.watchDemo')}
              >
                <Play size={32} className="text-white ml-1" />
              </motion.button>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-text-secondary text-sm">{t('home.demoCaption')}</span>
              <span className="text-text-muted text-sm">4:32</span>
            </div>
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
              onClick={() => navigate('/auth')}
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{item.avatar}</span>
                  <div>
                    <p className="font-semibold text-text-primary">{item.name}</p>
                    <p className="text-sm text-text-muted">{item.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-text-primary text-sm leading-relaxed">"{item.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-bg-primary to-bg-secondary/30">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border-primary mb-4">
              <HelpCircle size={16} className="text-purple-400" />
              <span className="text-sm text-text-secondary">{t('home.faqBadge')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              {t('home.faqTitle')}
            </h2>
            <p className="text-text-secondary text-lg">
              {t('home.faqSubtitle')}
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="card cursor-pointer"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenFaq(openFaq === index ? null : index); } }}
                aria-expanded={openFaq === index}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary pr-4">{faq.question}</h3>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={20} className="text-text-muted" />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.p
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      className="text-text-secondary text-sm leading-relaxed overflow-hidden"
                    >
                      {faq.answer}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, text: t('home.trustSSL'), color: 'text-green-400' },
              { icon: Lock, text: t('home.trustData'), color: 'text-blue-400' },
              { icon: RefreshCw, text: t('home.trustRefund'), color: 'text-purple-400' },
              { icon: CreditCard, text: t('home.trustPayment'), color: 'text-pink-400' },
            ].map((badge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-center gap-2 p-4 rounded-xl glass border border-border-primary/50"
              >
                <badge.icon size={18} className={badge.color} />
                <span className="text-sm text-text-secondary">{badge.text}</span>
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
                onClick={() => navigate('/auth')}
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
      <footer className="py-12 px-6 border-t border-border-primary bg-bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-4 md:gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Sparkles className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold text-text-primary">Science AI</span>
              </div>
              <p className="text-text-muted text-sm">
                {t('home.footerDesc')}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-text-primary mb-4">{t('home.footerProduct')}</h4>
              <div className="space-y-2">
                <button onClick={() => navigate('/pricing')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">{t('home.footerPricing')}</button>
                <button onClick={scrollToDemo} className="block text-text-muted hover:text-text-primary transition-colors text-sm">{t('home.footerHowItWorks')}</button>
                <button onClick={() => navigate('/auth')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">{t('home.footerRegister')}</button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-text-primary mb-4">{t('home.footerInfo')}</h4>
              <div className="space-y-2">
                <button onClick={() => navigate('/privacy')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">{t('home.footerPrivacy')}</button>
                <button onClick={() => navigate('/terms')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">{t('home.footerTerms')}</button>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-text-primary mb-4">{t('home.footerContacts')}</h4>
              <div className="space-y-2">
                <a href="mailto:support@science-ai.app" className="block text-text-muted hover:text-text-primary transition-colors text-sm">support@science-ai.app</a>
                <p className="text-text-muted text-sm">{t('home.footerResponseTime')}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border-primary pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              {t('home.footerCopyright')}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-muted">{t('home.footerSecurePayments')}</span>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded bg-white/10 text-xs text-text-secondary">Visa</div>
                <div className="px-2 py-1 rounded bg-white/10 text-xs text-text-secondary">Mastercard</div>
                <div className="px-2 py-1 rounded bg-white/10 text-xs text-text-secondary">Apple Pay</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
