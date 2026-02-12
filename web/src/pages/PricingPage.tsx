import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { API_URL } from '../config';
import { useAuthStore } from '../store/authStore';
import { getAuthorizationHeaders } from '../services/apiClient';
import {
  ArrowLeft,
  Check,
  X,
  Zap,
  Sparkles,
  Crown,
  Star,
  TrendingUp,
  Users,
  Clock,
  Shield,
  Layers,
  Brain,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { useSubscriptionStore, PlanType } from '../store/subscriptionStore';
import ConfirmModal, { AlertModal } from '../components/ConfirmModal';

const PricingPage = () => {
  useDocumentTitle('Тарифы');
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const subscription = useSubscriptionStore();

  // 🎯 ПЛАНЫ С МАРЖОЙ 40%
  // Цены синхронизированы с backend/usage.middleware.ts
  const plans = [
    {
      id: 'free' as PlanType,
      name: 'Free',
      description: 'Попробуйте бесплатно',
      monthlyPrice: 0,
      yearlyPrice: 0,
      yearlyMonthly: 0,
      icon: <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500/20 to-slate-500/20 border border-gray-500/30 flex items-center justify-center"><Users size={20} className="text-gray-400" /></div>,
      popular: false,
      premium: false,
      features: [
        { text: '3 эссе + 1 реферат/мес', included: true },
        { text: '2 презентации/мес', included: true },
        { text: '5 AI-анализов', included: true },
        { text: '10 сообщений/день', included: true },
        { text: 'Экспорт PDF', included: true },
        { text: 'AI изображения', included: false },
        { text: 'Anti-AI Detection', included: false },
        { text: 'Диссертации', included: false },
        { text: 'Приоритетная поддержка', included: false },
      ],
      buttonText: 'Начать бесплатно',
      buttonVariant: 'outline' as const,
    },
    {
      id: 'starter' as PlanType,
      name: 'Starter',
      description: 'Идеально для студентов',
      monthlyPrice: 5.99,
      yearlyPrice: 57.50,
      yearlyMonthly: 4.79,
      icon: <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center"><Sparkles size={20} className="text-blue-400" /></div>,
      popular: false,
      premium: false,
      features: [
        { text: '40 эссе + 15 рефератов + 5 курсовых/мес', included: true },
        { text: '30 презентаций/мес', included: true },
        { text: '50 AI-анализов', included: true },
        { text: '30 генераций диссертаций', included: true },
        { text: '10 AI изображений', included: true },
        { text: 'Экспорт PPTX/PDF/DOCX', included: true },
        { text: 'Anti-AI Detection', included: true },
        { text: 'Полные диссертации', included: false },
        { text: 'Приоритетная поддержка', included: false },
      ],
      buttonText: billingPeriod === 'yearly' ? 'Начать за $4.79/мес' : 'Начать за $5.99/мес',
      buttonVariant: 'outline' as const,
    },
    {
      id: 'pro' as PlanType,
      name: 'Pro',
      description: 'Для серьёзных исследований',
      monthlyPrice: 12.99,
      yearlyPrice: 124.70,
      yearlyMonthly: 10.39,
      icon: <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center"><Zap size={20} className="text-purple-400" /></div>,
      popular: true,
      premium: false,
      features: [
        { text: '90 эссе + 35 рефератов + 15 курсовых/мес', included: true },
        { text: '70 презентаций/мес', included: true },
        { text: '120 AI-анализов', included: true },
        { text: '100 генераций диссертаций', included: true },
        { text: '1 полная диссертация/мес', included: true },
        { text: '25 AI изображений', included: true },
        { text: 'Безлимитный AI-чат', included: true },
        { text: 'Антиплагиат проверка', included: true },
        { text: 'Приоритетная поддержка', included: true },
      ],
      buttonText: billingPeriod === 'yearly' ? 'Выбрать Pro за $10.39/мес' : 'Выбрать Pro за $12.99/мес',
      buttonVariant: 'primary' as const,
    },
    {
      id: 'premium' as PlanType,
      name: 'Maximum',
      description: 'Без ограничений',
      monthlyPrice: 24.99,
      yearlyPrice: 239.90,
      yearlyMonthly: 19.99,
      icon: <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center"><Crown size={20} className="text-amber-400" /></div>,
      popular: false,
      premium: true,
      features: [
        { text: '200 эссе + 80 рефератов + 30 курсовых/мес', included: true },
        { text: '150 презентаций/мес', included: true },
        { text: '200 AI-анализов', included: true },
        { text: '300 генераций диссертаций', included: true },
        { text: '3 полных диссертации/мес', included: true },
        { text: '50 AI изображений', included: true },
        { text: 'Безлимитный AI-чат', included: true },
        { text: 'Anti-AI Detection v3', included: true },
        { text: 'Антиплагиат + приоритетная поддержка', included: true },
      ],
      buttonText: billingPeriod === 'yearly' ? 'Выбрать Maximum за $19.99/мес' : 'Выбрать Maximum за $24.99/мес',
      buttonVariant: 'primary' as const,
    },
  ];

  // Modal states
  const [subscribeModal, setSubscribeModal] = useState<{ open: boolean; planId: PlanType | null; plan: typeof plans[number] | null; price: number; period: string }>({
    open: false, planId: null, plan: null, price: 0, period: '' 
  });
  const [successModal, setSuccessModal] = useState(false);

  const handleSelectPlan = (planId: PlanType) => {
    // Бесплатный план - активируем сразу без оплаты
    if (planId === 'free') {
      subscription.setPlan('free');
      setSuccessModal(true);
      return;
    }
    
    const plan = plans.find(p => p.id === planId);
    const price = billingPeriod === 'yearly' ? plan?.yearlyPrice || 0 : plan?.monthlyPrice || 0;
    const period = billingPeriod === 'yearly' ? 'год' : 'месяц';
    
    setSubscribeModal({ open: true, planId, plan: plan ?? null, price, period });
  };

  const confirmSubscription = async () => {
    if (subscribeModal.planId) {
      try {
        const { user: authUser } = useAuthStore.getState();
        
        const userEmail = authUser?.email || '';
        
        const response = await fetch(`${API_URL}/payments/create-checkout`, {
          method: 'POST',
          headers: getAuthorizationHeaders(),
          body: JSON.stringify({
            planId: subscribeModal.planId,
            billingPeriod: billingPeriod === 'yearly' ? 'annual' : 'monthly',
            email: userEmail,
          }),
        });
        
        const data = await response.json();
        
        if (data.success && data.checkoutUrl) {
          // Redirect to LemonSqueezy Checkout
          window.location.href = data.checkoutUrl;
          return;
        } else {
          alert(`Ошибка: ${data.error || 'Не удалось создать платёж. Попробуйте позже.'}`);
        }
      } catch (error: unknown) {
        console.error('Payment error:', error);
        alert('Ошибка подключения к платёжной системе. Проверьте интернет-соединение.');
      }
    }
    setSubscribeModal({ open: false, planId: null, plan: null, price: 0, period: '' });
  };

  // Статистика (обновляется с реальными данными)
  const stats = [
    { value: '99.9%', label: 'ДОСТУПНОСТЬ', color: 'text-purple-400' },
    { value: '10K+', label: 'ПРЕЗЕНТАЦИЙ', color: 'text-pink-400' },
    { value: '<1s', label: 'ВРЕМЯ ОТКЛИКА', color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden">

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft size={20} />
          <span>Назад</span>
        </motion.button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg">Science AI</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-secondary border border-border-primary transition-colors text-sm"
        >
          Dashboard
        </motion.button>
      </motion.header>

      {/* Hero Section */}
      <section className="text-center py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm mb-8"
        >
          <Star size={14} className="fill-current" />
          Доверяют 5,000+ пользователей
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          Создавай умнее.{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Делай быстрее.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-text-secondary text-lg max-w-2xl mx-auto mb-12"
        >
          AI платформа для создания презентаций и научных работ.
          От идеи до результата за минуты.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-12 md:gap-24 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="text-center"
            >
              <div className={`text-3xl md:text-4xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-text-muted uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-4 mb-4"
        >
          <span className={`text-sm font-medium transition-colors ${billingPeriod === 'monthly' ? 'text-text-primary' : 'text-text-muted'}`}>
            Месяц
          </span>
          
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-14 h-7 rounded-full bg-purple-500/30 p-1 transition-colors"
          >
            <motion.div
              animate={{ x: billingPeriod === 'yearly' ? 26 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-purple-500 shadow-lg"
            />
          </button>
          
          <span className={`text-sm font-medium transition-colors ${billingPeriod === 'yearly' ? 'text-text-primary' : 'text-text-muted'}`}>
            Год
          </span>
        </motion.div>

        <AnimatePresence mode="wait">
          {billingPeriod === 'yearly' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-sm text-green-400"
            >
              <TrendingUp size={14} />
              Скидка 20% при оплате за год
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const isCurrentPlan = subscription.currentPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.15 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`relative rounded-2xl p-6 transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-b from-purple-500/10 to-pink-500/5 border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : plan.premium
                      ? 'bg-gradient-to-b from-amber-500/10 to-orange-500/5 border-2 border-amber-500/50 shadow-lg shadow-amber-500/20'
                      : 'bg-bg-secondary/50 border border-border-primary hover:border-border-secondary'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-medium"
                  >
                    Выбор #1
                  </motion.div>
                )}

                {/* Icon */}
                <div className="mb-6">
                  {plan.icon}
                </div>

                {/* Plan Name */}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-text-secondary text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-2 h-12 flex items-end">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={billingPeriod}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-baseline"
                    >
                      {billingPeriod === 'yearly' && plan.yearlyMonthly > 0 ? (
                        <>
                          <span className="text-4xl font-bold">${plan.yearlyMonthly}</span>
                          <span className="text-text-secondary text-sm">/мес</span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">${plan.monthlyPrice}</span>
                          <span className="text-text-secondary text-sm">/мес</span>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                  {billingPeriod === 'yearly' && plan.yearlyPrice > 0 ? (
                    <motion.div
                      key="yearly-info"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mb-6 overflow-hidden"
                    >
                      <p className="text-text-muted text-sm">
                        ${plan.yearlyPrice}/год
                      </p>
                      <motion.p
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-green-400 text-xs font-medium"
                      >
                        ✨ Экономия ${Math.round(plan.monthlyPrice * 12 - plan.yearlyPrice)}/год
                      </motion.p>
                    </motion.div>
                  ) : billingPeriod === 'monthly' && plan.monthlyPrice > 0 ? (
                    <motion.p
                      key="monthly-info"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-text-muted text-sm mb-6 overflow-hidden"
                    >
                      или ${plan.yearlyMonthly}/мес при оплате за год
                    </motion.p>
                  ) : (
                    <motion.div key="spacer" className="h-10 mb-6" />
                  )}
                </AnimatePresence>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-xl font-medium mb-6 transition-all flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25'
                      : plan.premium
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25'
                        : isCurrentPlan
                          ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                          : 'bg-bg-tertiary hover:bg-bg-secondary text-text-primary'
                  }`}
                >
                  {isCurrentPlan ? (
                    <>
                      <Check size={16} />
                      Текущий план
                    </>
                  ) : (
                    <>
                      {plan.buttonText}
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 4 }}
                      >
                        →
                      </motion.span>
                    </>
                  )}
                </motion.button>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      {feature.included ? (
                        <Check size={16} className="text-green-400 flex-shrink-0" />
                      ) : (
                        <X size={16} className="text-text-muted flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-text-secondary' : 'text-text-muted'}>
                        {feature.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 border-t border-border-primary">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-4"
          >
            Всё что нужно для{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              успешной работы
            </span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-text-secondary text-center max-w-2xl mx-auto mb-16"
          >
            Мощные AI инструменты для создания презентаций, диссертаций и научных работ
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Layers size={24} />,
                title: 'AI Презентации',
                description: 'Создавайте профессиональные презентации за минуты с помощью искусственного интеллекта',
                gradient: 'from-purple-500 to-pink-500',
              },
              {
                icon: <FileText size={24} />,
                title: 'Редактор диссертаций',
                description: 'Пишите научные работы с умным помощником, который понимает контекст',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: <ImageIcon size={24} />,
                title: 'AI изображения',
                description: 'Генерируйте уникальные иллюстрации для ваших презентаций',
                gradient: 'from-orange-500 to-red-500',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl bg-bg-secondary/50 border border-border-primary hover:border-border-secondary transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / Trust Section */}
      <section className="px-6 py-20 border-t border-border-primary">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-8 flex-wrap"
          >
            {[
              { icon: <Shield size={20} />, text: 'SSL защита' },
              { icon: <Clock size={20} />, text: 'Возврат 24ч' },
              { icon: <Users size={20} />, text: '5,000+ пользователей' },
              { icon: <TrendingUp size={20} />, text: '99.9% uptime' },
            ].map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-text-secondary"
              >
                {item.icon}
                <span className="text-sm">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30"
        >
          <h2 className="text-3xl font-bold mb-4">
            Готовы начать?
          </h2>
          <p className="text-text-secondary mb-8">
            Присоединяйтесь к тысячам пользователей, которые уже используют Science AI
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelectPlan('pro')}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
          >
            Начать с Pro →
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border-primary">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-sm">© 2026 Science AI. Все права защищены.</p>
          <div className="flex items-center gap-6 text-sm">
            <button onClick={() => navigate('/privacy')} className="text-text-muted hover:text-text-primary transition-colors">
              Конфиденциальность
            </button>
            <button onClick={() => navigate('/terms')} className="text-text-muted hover:text-text-primary transition-colors">
              Условия
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ConfirmModal
        isOpen={subscribeModal.open}
        onClose={() => setSubscribeModal({ open: false, planId: null, plan: null, price: 0, period: '' })}
        onConfirm={confirmSubscription}
        title={`Подписка на ${subscribeModal.plan?.name}`}
        message={
          <div className="space-y-3">
            <p>Вы получите доступ к премиум функциям:</p>
            <ul className="list-disc list-inside text-text-secondary space-y-1 text-sm">
              <li>Расширенные лимиты презентаций</li>
              <li>AI-генерация изображений</li>
              <li>Приоритетная генерация</li>
              <li>Премиум поддержка</li>
            </ul>
            <div className="pt-2 border-t border-border-primary">
              <p className="text-2xl font-bold text-purple-400">
                ${subscribeModal.price}/{subscribeModal.period}
              </p>
            </div>
          </div>
        }
        confirmText="Оформить подписку"
        cancelText="Отмена"
        type="info"
      />

      <AlertModal
        isOpen={successModal}
        onClose={() => {
          setSuccessModal(false);
          navigate('/dashboard');
        }}
        title="Подписка активирована! 🎉"
        message="Поздравляем! Теперь вам доступны все премиум функции. Приятного использования!"
        buttonText="Начать работу"
        type="success"
      />
    </div>
  );
};

export default PricingPage;
