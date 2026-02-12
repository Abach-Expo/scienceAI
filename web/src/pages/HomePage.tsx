import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../store/authStore';
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
  useDocumentTitle('AI для студентов');
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
      title: 'AI Ассистент',
      description: 'Умный помощник для исследований, анализа и генерации контента',
      color: 'from-purple-500 to-violet-600',
    },
    {
      icon: Layers,
      title: 'Презентации',
      description: 'Создавайте профессиональные презентации за минуты',
      color: 'from-pink-500 to-rose-600',
    },
    {
      icon: GraduationCap,
      title: 'Диссертации',
      description: 'Помощь в написании научных работ и диссертаций',
      color: 'from-blue-500 to-cyan-600',
    },
    {
      icon: Download,
      title: 'Экспорт',
      description: 'PPTX, PDF и другие форматы одним кликом',
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: MessageSquare,
      title: 'Умный чат',
      description: 'Общайтесь с AI для решения любых задач',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Shield,
      title: 'Антиплагиат',
      description: '95%+ уникальность, обход AI-детекторов',
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
    { value: '5,000+', label: 'Студентов' },
    { value: '15,000+', label: 'Работ создано' },
    { value: '94%', label: 'Проходят антиплагиат' },
    { value: '10 мин', label: 'Среднее время' },
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
              title={currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="hidden sm:block px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors"
            >
              Тарифы
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors"
            >
              Войти
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium flex items-center gap-2"
            >
              Начать сейчас
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
            <span className="text-xs text-green-400">Онлайн сейчас</span>
          </div>
          <p className="text-sm text-text-secondary">
            <span className="text-text-primary font-semibold">{onlineStudents} студентов</span> создают работы прямо сейчас
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
              <span className="text-sm text-text-secondary">🔥 Диссертация за 10 минут вместо 3-6 месяцев</span>
            </motion.div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-text-primary">AI создаёт</span>
              <br />
              <span className="gradient-text">диссертации</span>
              <br />
              <span className="text-text-primary">за минуты</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              AI пишет магистерские диссертации, курсовые, презентации за считанные минуты.
              <span className="text-purple-400 font-semibold"> Антиплагиат 94%+</span> — обходит любые проверки.
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
              Попробовать сейчас
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl glass border border-border-primary text-text-primary font-bold text-lg flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
              >
                <Play size={22} />
                Смотреть демо
              </motion.button>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
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
              Всё что нужно для
              <span className="gradient-text"> идеальной работы</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Мощные инструменты AI для создания диссертаций, курсовых и презентаций
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
              Как это работает
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              3 простых шага до готовой диссертации
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { step: '01', title: 'Выберите тип работы', desc: 'Диссертация, курсовая, реферат или презентация', icon: FileText },
              { step: '02', title: 'Опишите тему', desc: 'AI задаст уточняющие вопросы и предложит структуру', icon: MessageSquare },
              { step: '03', title: 'Получите результат', desc: 'Готовая работа с источниками за 10-30 минут', icon: CheckCircle },
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
                title="Смотреть демо"
              >
                <Play size={32} className="text-white ml-1" />
              </motion.button>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-text-secondary text-sm">Демо: Создание диссертации за 15 минут</span>
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
              Сравни цены и
              <span className="gradient-text"> сэкономь тысячи</span>
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
                <div className="text-red-400 text-sm font-semibold mb-2">❌ Фрилансер</div>
                <div className="text-4xl font-bold text-red-400 mb-2">Дорого</div>
                <div className="text-text-muted text-sm mb-4">за работу</div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div>⏰ 2-4 недели ожидания</div>
                  <div>🔄 Бесконечные правки</div>
                  <div>❓ Не всегда качественно</div>
                  <div>💸 Предоплата 50%</div>
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
                ⭐ Рекомендуем
              </div>
              <div className="text-center pt-4">
                <div className="text-purple-400 text-sm font-semibold mb-2">✅ Science AI</div>
                <div className="text-4xl font-bold text-purple-400 mb-2">от $5.99</div>
                <div className="text-text-muted text-sm mb-4">в месяц</div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div>⚡ Результат за 10 минут</div>
                  <div>♾️ Безлимитные правки</div>
                  <div>🎯 Проходит антиплагиат</div>
                  <div>🔒 7 дней гарантия возврата</div>
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
                <div className="text-red-400 text-sm font-semibold mb-2">❌ Агентство</div>
                <div className="text-4xl font-bold text-red-400 mb-2">$2000-10000</div>
                <div className="text-text-muted text-sm mb-4">за диссертацию</div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <div>⏰ 1-3 месяца работы</div>
                  <div>📝 Договор и NDA</div>
                  <div>🔒 Зависимость от исполнителя</div>
                  <div>💸 Полная предоплата</div>
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
              🚀 Начать за $5.99/мес
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
              Что говорят студенты
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Реальные истории успеха наших пользователей
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
              <span className="text-sm text-text-secondary">Частые вопросы</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Есть вопросы?
            </h2>
            <p className="text-text-secondary text-lg">
              Ответы на самые популярные вопросы
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
              { icon: Shield, text: 'SSL Защита', color: 'text-green-400' },
              { icon: Lock, text: 'Данные в безопасности', color: 'text-blue-400' },
              { icon: RefreshCw, text: '7 дней возврат', color: 'text-purple-400' },
              { icon: CreditCard, text: 'Безопасная оплата', color: 'text-pink-400' },
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
                <span className="text-sm text-amber-300">Скидка 20% при оплате за год</span>
              </motion.div>

              <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                Начни прямо сейчас
              </h2>
              <p className="text-text-secondary text-lg mb-6 max-w-2xl mx-auto">
                Пока ты думаешь — другие уже сдают работы, сделанные за 10 минут
              </p>
              
              {/* Price highlight */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="text-5xl font-bold gradient-text">от $5.99</span>
                <span className="text-lg text-text-secondary">/мес</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/auth')}
                className="px-10 py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-xl flex items-center justify-center gap-3 mx-auto shadow-lg shadow-purple-500/30"
              >
                <Sparkles size={24} />
                Начать прямо сейчас
                <ArrowRight size={24} />
              </motion.button>
              
              <p className="text-text-muted text-sm mt-4">
                Безопасная оплата • 7 дней гарантия возврата
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border-primary bg-bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Sparkles className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold text-text-primary">Science AI</span>
              </div>
              <p className="text-text-muted text-sm">
                AI-платформа для студентов и исследователей. Диссертации, курсовые, презентации за минуты.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-text-primary mb-4">Продукт</h4>
              <div className="space-y-2">
                <button onClick={() => navigate('/pricing')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">Тарифы</button>
                <button onClick={scrollToDemo} className="block text-text-muted hover:text-text-primary transition-colors text-sm">Как это работает</button>
                <button onClick={() => navigate('/auth')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">Регистрация</button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-text-primary mb-4">Информация</h4>
              <div className="space-y-2">
                <button onClick={() => navigate('/privacy')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">Конфиденциальность</button>
                <button onClick={() => navigate('/terms')} className="block text-text-muted hover:text-text-primary transition-colors text-sm">Условия использования</button>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-text-primary mb-4">Контакты</h4>
              <div className="space-y-2">
                <a href="mailto:support@science-ai.app" className="block text-text-muted hover:text-text-primary transition-colors text-sm">support@science-ai.app</a>
                <p className="text-text-muted text-sm">Ответ в течение 24 часов</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border-primary pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              © 2026 Science AI. Все права защищены.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-muted">Безопасные платежи:</span>
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
