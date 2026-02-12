import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  Zap, 
  Crown, 
  Sparkles, 
  CreditCard,
  Gift,
  TrendingUp,
  Shield,
  Loader2
} from 'lucide-react';
import { 
  useSubscriptionStore, 
  SUBSCRIPTION_PLANS, 
  TOKEN_PACKAGES,
  formatTokens,
  estimatePresentations,
  PlanType
} from '../store/subscriptionStore';
import { createCheckout, BillingPeriod } from '../services/payment';
import { useAuthStore } from '../store/authStore';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  reason 
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'tokens'>('plans');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { currentPlan, tokensBalance, setPlan, addTokens } = useSubscriptionStore();

  const handleSelectPlan = async (planId: PlanType) => {
    try {
      setLoadingPlan(planId);
      
      // Get user email from authStore
      const email = useAuthStore.getState().getUserEmail();
      
      if (!email) {
        alert('Ошибка: не найден email пользователя. Войдите в аккаунт.');
        return;
      }

      const result = await createCheckout(planId, email, billingPeriod);
      
      if (result.success && result.checkoutUrl) {
        // Redirect to LemonSqueezy checkout
        window.location.href = result.checkoutUrl;
      } else {
        alert(`Ошибка: ${result.error || 'Не удалось создать платёж'}`);
      }
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      const message = error instanceof Error ? error.message : 'Попробуйте позже';
      alert(`Ошибка платежа: ${message}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyTokens = async (packageId: string) => {
    const pkg = TOKEN_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;
    
    // Token purchases also go through LemonSqueezy checkout
    alert('Покупка токенов будет доступна в следующем обновлении. Выберите план подписки.');
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Sparkles className="w-6 h-6" />;
      case 'pro': return <Crown className="w-6 h-6" />;
      case 'premium': return <Crown className="w-6 h-6" />;
      default: return <Sparkles className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'starter': return 'from-blue-500 to-blue-600';
      case 'pro': return 'from-purple-500 to-purple-600';
      case 'premium': return 'from-amber-500 to-orange-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-bg-secondary rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-text-primary" />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                🚀 Выберите план
              </h2>
              {reason && (
                <p className="text-white/80 text-sm">{reason}</p>
              )}
              <div className="mt-4 flex items-center justify-center gap-2 text-white/90">
                <Shield className="w-4 h-4" />
                <span className="text-sm">
                  План: {(SUBSCRIPTION_PLANS[currentPlan] || SUBSCRIPTION_PLANS.starter).name}
                </span>
              </div>
            </div>
            
            {/* Tab - только планы */}
            <div className="flex justify-center mt-4 gap-2">
              <button
                onClick={() => setActiveTab('plans')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'plans' 
                    ? 'bg-white text-purple-600' 
                    : 'bg-white/20 text-text-primary hover:bg-white/30'
                }`}
              >
                📋 Планы подписки
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'plans' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.entries(SUBSCRIPTION_PLANS) as [PlanType, typeof SUBSCRIPTION_PLANS[PlanType]][]).map(([planId, plan]) => {
                  const isCurrentPlan = currentPlan === planId;
                  const isPopular = 'popular' in plan && plan.popular;
                  
                  return (
                    <motion.div
                      key={planId}
                      whileHover={{ scale: 1.02 }}
                      className={`relative rounded-xl border-2 p-5 ${
                        isCurrentPlan 
                          ? 'border-green-500 bg-green-500/10' 
                          : isPopular
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-border-secondary bg-bg-tertiary/50'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-text-primary text-xs px-3 py-1 rounded-full font-medium">
                          ⭐ Популярный
                        </div>
                      )}
                      
                      {isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-text-primary text-xs px-3 py-1 rounded-full font-medium">
                          ✓ Текущий
                        </div>
                      )}
                      
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanColor(planId)} flex items-center justify-center text-white mb-4`}>
                        {getPlanIcon(planId)}
                      </div>
                      
                      <h3 className="text-lg font-bold text-text-primary mb-1">
                        {plan.name}
                      </h3>
                      
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-3xl font-bold text-text-primary">
                          ${plan.price}
                        </span>
                        {'priceNote' in plan && (
                          <span className="text-text-secondary text-sm">{String(plan.priceNote)}</span>
                        )}
                      </div>
                      
                      <div className="text-sm text-text-secondary mb-4">
                        <span>~{estimatePresentations(plan.tokens)} презентаций</span>
                      </div>
                      
                      <ul className="space-y-2 mb-4">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      <button
                        onClick={() => handleSelectPlan(planId)}
                        disabled={isCurrentPlan || loadingPlan === planId}
                        className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                          isCurrentPlan
                            ? 'bg-gray-700 text-text-secondary cursor-not-allowed'
                            : loadingPlan === planId
                              ? 'bg-gray-600 text-text-secondary cursor-wait'
                              : `bg-gradient-to-r ${getPlanColor(planId)} text-white hover:shadow-lg hover:shadow-purple-500/25`
                        }`}
                      >
                        {loadingPlan === planId ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Загрузка...
                          </>
                        ) : isCurrentPlan ? 'Текущий план' : 'Выбрать'}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-border-primary p-4 text-center text-sm text-text-muted">
            <p>💳 Безопасные платежи • 🔒 SSL защита • ↩️ Возврат в течение 24 часов</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Компонент статуса плана для header (без показа токенов)
export const TokenBalance: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { currentPlan } = useSubscriptionStore();
  const plan = SUBSCRIPTION_PLANS[currentPlan] || SUBSCRIPTION_PLANS.starter;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-secondary transition-colors"
    >
      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${
        currentPlan === 'premium' ? 'from-amber-500 to-orange-600' :
        currentPlan === 'pro' ? 'from-purple-500 to-purple-600' :
        currentPlan === 'starter' ? 'from-blue-500 to-blue-600' :
        'from-blue-500 to-blue-600'
      } flex items-center justify-center`}>
        {currentPlan === 'premium' ? <Crown className="w-3 h-3 text-text-primary" /> :
         currentPlan === 'pro' ? <Crown className="w-3 h-3 text-text-primary" /> :
         <Sparkles className="w-3 h-3 text-text-primary" />}
      </div>
      <span className="text-text-primary font-medium">
        {plan.name}
      </span>
    </button>
  );
};

// Компонент предупреждения о лимите
export const LimitWarning: React.FC<{ 
  onUpgrade: () => void;
  message?: string;
}> = ({ onUpgrade, message }) => {
  const { freePresentationsUsed, freePresentationsLimit } = useSubscriptionStore();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl p-4 mb-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-amber-400 font-medium mb-1">
            ⚠️ {message || 'Лимит почти исчерпан'}
          </h4>
          <p className="text-text-secondary text-sm mb-3">
            Использовано {freePresentationsUsed} из {freePresentationsLimit} бесплатных презентаций.
          </p>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            🚀 Улучшить план
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionModal;
