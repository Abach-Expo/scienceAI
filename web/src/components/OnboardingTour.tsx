import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  GraduationCap,
  Brain,
  FileText,
  Wand2,
  CheckCircle,
  Rocket
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string; // CSS селектор для подсветки элемента
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  tourId: string; // Уникальный ID тура для хранения в localStorage
  steps?: TourStep[]; // Опционально - по умолчанию DISSERTATION_TOUR_STEPS
  onComplete?: () => void;
  onSkip?: () => void;
}

const DISSERTATION_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в AI-редактор! 🎓',
    description: 'Здесь вы можете создавать научные работы любой сложности — от курсовых до докторских диссертаций. Искусственный интеллект поможет вам на каждом этапе.',
    icon: <GraduationCap size={32} className="text-blue-400" />,
    position: 'center',
  },
  {
    id: 'sidebar',
    title: 'Структура работы',
    description: 'Слева находится структура вашей работы. Кликайте на главы и подразделы для редактирования. Вы можете добавлять, удалять и переименовывать разделы.',
    icon: <FileText size={32} className="text-purple-400" />,
    targetSelector: 'aside',
    position: 'right',
  },
  {
    id: 'ai-panel',
    title: 'AI-помощник',
    description: 'Справа — ваш умный помощник. Задавайте вопросы, просите написать раздел или улучшить текст. AI понимает научный контекст и форматирование по ГОСТ.',
    icon: <Brain size={32} className="text-pink-400" />,
    targetSelector: '[data-tour="ai-panel"]',
    position: 'left',
  },
  {
    id: 'quick-actions',
    title: 'Быстрые действия',
    description: 'Используйте кнопки быстрых команд: генерация структуры, написание главы целиком (20+ страниц), проверка уникальности и экспорт в PDF/DOCX.',
    icon: <Wand2 size={32} className="text-amber-400" />,
    targetSelector: '[data-tour="quick-actions"]',
    position: 'bottom',
  },
  {
    id: 'language',
    title: 'Выбор языка',
    description: 'AI пишет на 10 языках! Выберите нужный язык в настройках слева — система автоматически применит соответствующий научный стандарт (ГОСТ, APA, DIN и др.)',
    icon: <Sparkles size={32} className="text-green-400" />,
    targetSelector: '[data-tour="language-select"]',
    position: 'right',
  },
  {
    id: 'ready',
    title: 'Всё готово! 🚀',
    description: 'Теперь вы знаете основы. Начните с ввода темы работы и нажмите "Сгенерировать структуру" — AI создаст оптимальный план для вашей диссертации.',
    icon: <Rocket size={32} className="text-cyan-400" />,
    position: 'center',
  },
];

export const OnboardingTour = ({ 
  tourId, 
  steps = DISSERTATION_TOUR_STEPS, 
  onComplete, 
  onSkip 
}: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Проверяем, проходил ли пользователь тур
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`onboarding_${tourId}`);
    if (!hasSeenTour) {
      // Показываем с небольшой задержкой для плавности
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [tourId]);

  // Подсветка целевого элемента
  useEffect(() => {
    const step = steps[currentStep];
    if (step?.targetSelector && isVisible) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, steps, isVisible]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(`onboarding_${tourId}`, 'completed');
    setIsVisible(false);
    onComplete?.();
  }, [tourId, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(`onboarding_${tourId}`, 'skipped');
    setIsVisible(false);
    onSkip?.();
  }, [tourId, onSkip]);

  // Клавиатурная навигация
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleNext, handlePrev, handleSkip]);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Позиционирование тултипа относительно подсвеченного элемента
  const getTooltipPosition = () => {
    if (!highlightRect || step.position === 'center') {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      };
    }

    const padding = 20;
    const tooltipWidth = 400;
    const tooltipHeight = 280;

    switch (step.position) {
      case 'right':
        return {
          top: `${Math.min(highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - padding)}px`,
          left: `${highlightRect.right + padding}px`,
        };
      case 'left':
        return {
          top: `${Math.min(highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - padding)}px`,
          left: `${highlightRect.left - tooltipWidth - padding}px`,
        };
      case 'bottom':
        return {
          top: `${highlightRect.bottom + padding}px`,
          left: `${Math.max(padding, Math.min(highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))}px`,
        };
      case 'top':
        return {
          top: `${highlightRect.top - tooltipHeight - padding}px`,
          left: `${Math.max(padding, Math.min(highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))}px`,
        };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Затемнение фона */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998]"
            style={{ 
              background: highlightRect 
                ? 'transparent' 
                : 'rgba(0, 0, 0, 0.75)' 
            }}
          />

          {/* Маска с вырезом для подсвеченного элемента */}
          {highlightRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] pointer-events-none"
              style={{
                background: `radial-gradient(ellipse ${highlightRect.width + 40}px ${highlightRect.height + 40}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, transparent 70%, rgba(0,0,0,0.8) 100%)`,
              }}
            />
          )}

          {/* Рамка вокруг подсвеченного элемента */}
          {highlightRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: highlightRect.top - 4,
                left: highlightRect.left - 4,
                width: highlightRect.width + 8,
                height: highlightRect.height + 8,
                border: '2px solid rgba(139, 92, 246, 0.8)',
                borderRadius: '12px',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
              }}
            />
          )}

          {/* Карточка тура */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-[10000] w-[400px] bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden"
            style={getTooltipPosition()}
          >
            {/* Заголовок с иконкой */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ rotate: -10, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0"
                >
                  {step.icon}
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Прогресс и навигация */}
            <div className="px-6 pb-6">
              {/* Индикатор прогресса */}
              <div className="flex items-center gap-1.5 mb-4">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      width: index === currentStep ? 24 : 8,
                      backgroundColor: index <= currentStep 
                        ? 'rgb(139, 92, 246)' 
                        : 'rgba(139, 92, 246, 0.2)',
                    }}
                    className="h-2 rounded-full"
                  />
                ))}
                <span className="ml-auto text-xs text-text-muted">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>

              {/* Кнопки */}
              <div className="flex items-center gap-3">
                {!isFirstStep && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePrev}
                    className="px-4 py-2 rounded-xl bg-bg-tertiary border border-border-primary hover:border-purple-500/50 text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft size={16} />
                    Назад
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle size={16} />
                      Начать работу
                    </>
                  ) : (
                    <>
                      Далее
                      <ChevronRight size={16} />
                    </>
                  )}
                </motion.button>
              </div>

              {/* Кнопка пропуска */}
              <button
                onClick={handleSkip}
                className="w-full mt-3 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Пропустить тур (Esc)
              </button>
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Экспорт шагов для диссертации
export const DISSERTATION_STEPS = DISSERTATION_TOUR_STEPS;

// Хук для сброса тура (для тестирования)
export const useResetTour = (tourId: string) => {
  return () => {
    localStorage.removeItem(`onboarding_${tourId}`);
    window.location.reload();
  };
};

export default OnboardingTour;
