import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertTriangle, TrendingUp, Sparkles, FileText, Presentation } from 'lucide-react';
import { useSubscriptionStore, PLAN_LIMITS, PlanType } from '../store/subscriptionStore';

interface UsageBannerProps {
  compact?: boolean;
}

export const UsageBanner = ({ compact = false }: UsageBannerProps) => {
  const navigate = useNavigate();
  const { currentPlan, tokensBalance, getUsagePercentage, usage, getRemainingLimits } = useSubscriptionStore();
  const remaining = getRemainingLimits();
  
  const limits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter;
  const { overall: usagePercent } = getUsagePercentage();
  
  // Определяем цвет прогресс-бара
  const getProgressColor = () => {
    if (usagePercent >= 90) return 'from-red-500 to-red-600';
    if (usagePercent >= 70) return 'from-amber-500 to-orange-500';
    return 'from-purple-500 to-pink-500';
  };
  
  // Показываем предупреждение только если использовано больше 50%
  const showWarning = usagePercent >= 50;
  const isLow = usagePercent >= 80;
  const isCritical = usagePercent >= 95;
  
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-secondary border border-border-primary"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-sm text-text-secondary">
            {tokensBalance.toLocaleString()} токенов
          </span>
        </div>
        
        <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - usagePercent}%` }}
            className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full`}
          />
        </div>
        
        {currentPlan === 'starter' && (
          <button
            onClick={() => navigate('/pricing')}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium"
          >
            Улучшить
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border ${
        isCritical 
          ? 'bg-red-500/10 border-red-500/30' 
          : isLow 
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-bg-secondary border-border-primary'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isCritical ? (
              <AlertTriangle size={18} className="text-red-400" />
            ) : (
              <Zap size={18} className="text-purple-400" />
            )}
            <span className="font-semibold text-text-primary">
              {currentPlan === 'starter' ? 'Starter' :
               currentPlan === 'premium' ? 'Maximum' : 'Pro'}
            </span>
          </div>
          
          <div className="space-y-2 text-sm text-text-secondary">
            <div className="flex justify-between">
              <span>Осталось токенов:</span>
              <span className={isCritical ? 'text-red-400 font-semibold' : 'text-text-primary'}>
                {tokensBalance.toLocaleString()}
              </span>
            </div>
            
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - usagePercent}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full`}
              />
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <Presentation size={12} />
                Презентаций: {usage.presentationsCreated}/{limits.presentationsPerMonth}
              </span>
              <span className="text-text-muted flex items-center gap-1">
                <FileText size={12} />
                Работ: {usage.academicWorksCreated}/{limits.essaysPerMonth}
              </span>
            </div>
          </div>
        </div>
        
        {currentPlan !== 'premium' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/pricing')}
            className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 ${
              isCritical 
                ? 'bg-red-500 text-white' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            }`}
          >
            <TrendingUp size={16} />
            {isCritical ? 'Продлить' : 'Улучшить'}
          </motion.button>
        )}
      </div>
      
      {/* Преимущества апгрейда */}
      {currentPlan === 'starter' && showWarning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-border-primary"
        >
          <div className="text-sm text-text-secondary mb-2">
            Перейдите на Pro за $12.99 и получите:
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-green-400">
              ✓ 90 эссе/мес
            </div>
            <div className="flex items-center gap-1 text-green-400">
              ✓ 70 презентаций
            </div>
            <div className="flex items-center gap-1 text-green-400">
              ✓ Безлимитный чат
            </div>
            <div className="flex items-center gap-1 text-green-400">
              ✓ Anti-AI Detection v3
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default UsageBanner;
