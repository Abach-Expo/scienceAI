import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Layers, 
  MessageSquare, 
  FileText,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
  Keyboard,
  MousePointer,
  Zap,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в Science AI!',
    description: 'Мы поможем вам быстро освоиться с основными функциями платформы.',
    icon: Sparkles,
    tip: 'Этот тур займёт меньше минуты',
  },
  {
    id: 'chat',
    title: 'AI Чат',
    description: 'Общайтесь с искусственным интеллектом для получения помощи в исследованиях, написании текстов и решении задач.',
    icon: MessageSquare,
    tip: 'Попробуйте спросить: "Помоги написать введение для реферата"',
  },
  {
    id: 'presentations',
    title: 'Создание презентаций',
    description: 'Автоматически генерируйте профессиональные презентации с AI. Просто опишите тему!',
    icon: Layers,
    tip: 'AI создаст структуру, тексты и подберёт изображения',
  },
  {
    id: 'dissertation',
    title: 'Научные работы',
    description: 'Получите помощь в написании диссертаций, курсовых и рефератов с правильной структурой.',
    icon: FileText,
    tip: 'AI знает требования ГОСТ и академические стандарты',
  },
  {
    id: 'shortcuts',
    title: 'Горячие клавиши',
    description: 'Используйте Ctrl+K для быстрого поиска, Ctrl+N для нового чата, Ctrl+S для сохранения.',
    icon: Keyboard,
    tip: 'Нажмите ? чтобы увидеть все сочетания клавиш',
  },
  {
    id: 'done',
    title: 'Готово!',
    description: 'Вы готовы начать работу. Создайте свой первый проект прямо сейчас!',
    icon: CheckCircle,
    tip: 'Если понадобится помощь — нажмите на иконку ? в правом нижнем углу',
  },
];

export const OnboardingTour = ({ 
  isOpen, 
  onComplete 
}: { 
  isOpen: boolean; 
  onComplete: () => void;
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-bg-secondary border border-border-primary rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="relative h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
            >
              <step.icon size={48} className="text-white" />
            </motion.div>
            
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>

            {/* Progress dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {steps.map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep 
                      ? 'bg-purple-500' 
                      : i < currentStep 
                        ? 'bg-purple-500/50' 
                        : 'bg-white/20'
                  }`}
                  animate={{
                    scale: i === currentStep ? 1.2 : 1,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <motion.div
              key={step.id + '-content'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-text-primary mb-2">{step.title}</h2>
              <p className="text-text-secondary mb-4">{step.description}</p>
              
              {step.tip && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Zap size={18} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-200">{step.tip}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                currentStep === 0
                  ? 'text-text-muted cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <ArrowLeft size={18} />
              Назад
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium"
            >
              {currentStep === steps.length - 1 ? 'Начать работу' : 'Далее'}
              <ArrowRight size={18} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook для управления онбордингом
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      setHasCompletedOnboarding(false);
      // Показываем онбординг с небольшой задержкой
      const timer = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
    setHasCompletedOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed');
    setHasCompletedOnboarding(false);
  };

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    hasCompletedOnboarding,
    completeOnboarding,
    resetOnboarding,
    startOnboarding,
  };
};

// Компонент подсказок (tooltips) для элементов
export const FeatureTip = ({
  id,
  children,
  title,
  description,
}: {
  id: string;
  children: React.ReactNode;
  title: string;
  description: string;
}) => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedTips = JSON.parse(localStorage.getItem('dismissed_tips') || '[]');
    if (!dismissedTips.includes(id)) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setDismissed(true);
    }
  }, [id]);

  const handleDismiss = () => {
    const dismissedTips = JSON.parse(localStorage.getItem('dismissed_tips') || '[]');
    localStorage.setItem('dismissed_tips', JSON.stringify([...dismissedTips, id]));
    setShow(false);
    setDismissed(true);
  };

  return (
    <div className="relative">
      {children}
      
      <AnimatePresence>
        {show && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-4 rounded-xl bg-bg-tertiary border border-accent-primary/30 shadow-xl"
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-bg-tertiary border-l border-t border-accent-primary/30 rotate-45" />
            
            <div className="flex items-start gap-3">
              <MousePointer size={18} className="text-accent-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
                <p className="text-xs text-text-secondary">{description}</p>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="mt-3 text-xs text-accent-primary hover:text-accent-secondary transition-colors"
            >
              Понятно
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingTour;
