import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

// Варианты анимаций для страниц
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3,
};

// Обёртка для анимации страницы
export const PageTransition = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={pageTransition}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger анимация для списков
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// Обёртка для stagger списков
export const StaggerContainer = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <motion.div
    variants={staggerContainer}
    initial="initial"
    animate="animate"
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <motion.div variants={staggerItem} className={className}>
    {children}
  </motion.div>
);

// Fade In анимация
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Scale анимация
export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

// Slide анимации
export const slideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 30 },
};

export const slideDown = {
  initial: { opacity: 0, y: -30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
};

export const slideLeft = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 },
};

export const slideRight = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

// Hover анимации для кнопок
export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.2 },
};

export const buttonTap = {
  scale: 0.98,
};

// Hover для карточек
export const cardHover = {
  y: -4,
  transition: { duration: 0.2 },
};

// Пульсирующая анимация
export const pulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

// Floating анимация
export const float = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

// Shake анимация для ошибок
export const shake = {
  x: [0, -10, 10, -10, 10, 0],
  transition: { duration: 0.5 },
};

// Skeleton shimmer эффект
export const shimmer = {
  backgroundPosition: ['200% 0', '-200% 0'],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
};

// Typing cursor эффект
export const typingCursor = {
  opacity: [1, 0, 1],
  transition: {
    duration: 1,
    repeat: Infinity,
  },
};

// Counter animation hook - animates from 0 to target number
export const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const motionVal = useMotionValue(0);
    const unsubscribe = motionVal.on('change', (latest) => {
      setCount(Math.round(latest));
    });

    const controls = animate(motionVal, end, {
      duration: duration / 1000,
      ease: 'easeOut',
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [end, duration]);

  return count;
};

// Animated number display component
export const AnimatedCounter = ({
  value,
  duration = 2000,
  className = '',
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const count = useCountUp(value, duration);
  return <span className={className}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// Gradient text with animated shimmer
export const GradientShimmerText = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <motion.span
    className={`bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto] ${className}`}
    animate={{ backgroundPosition: ['0% center', '200% center'] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
  >
    {children}
  </motion.span>
);

// Staggered reveal for grid items
export const StaggerGrid = ({
  children,
  className = '',
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: '-50px' }}
    variants={{
      visible: { transition: { staggerChildren: staggerDelay } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerGridItem = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 30, scale: 0.95 },
      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Компонент для анимированного появления секций при скролле
export const ScrollReveal = ({ 
  children, 
  className = '',
  delay = 0,
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Компонент для параллакс эффекта
export const Parallax = ({ 
  children, 
  offset = 50,
  className = '',
}: { 
  children: ReactNode; 
  offset?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ y: offset }}
    whileInView={{ y: 0 }}
    viewport={{ once: false }}
    transition={{ type: 'spring', stiffness: 100 }}
    className={className}
  >
    {children}
  </motion.div>
);

export default PageTransition;
