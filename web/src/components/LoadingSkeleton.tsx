import { motion } from 'framer-motion';

// Базовый скелетон с анимацией
import { memo } from 'react';

const SkeletonPulse = ({ className = '' }: { className?: string }) => (
  <motion.div
    className={`bg-bg-tertiary rounded-lg ${className}`}
    animate={{
      opacity: [0.5, 0.8, 0.5],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

// Скелетон для карточки проекта
export const ProjectCardSkeleton = () => (
  <div className="p-4 rounded-2xl bg-bg-secondary border border-border-primary">
    <div className="flex items-start gap-4">
      <SkeletonPulse className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <SkeletonPulse className="h-5 w-3/4" />
        <SkeletonPulse className="h-4 w-1/2" />
      </div>
      <SkeletonPulse className="w-8 h-8 rounded-lg" />
    </div>
  </div>
);

// Скелетон для списка чатов
export const ChatListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <ProjectCardSkeleton key={i} />
    ))}
  </div>
);

// Скелетон для сообщения в чате
export const ChatMessageSkeleton = ({ isUser = false }: { isUser?: boolean }) => (
  <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
    <SkeletonPulse className="w-10 h-10 rounded-full flex-shrink-0" />
    <div className={`flex-1 max-w-[70%] space-y-2 ${isUser ? 'items-end' : ''}`}>
      <SkeletonPulse className="h-4 w-24" />
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-full" />
        <SkeletonPulse className="h-4 w-5/6" />
        <SkeletonPulse className="h-4 w-3/4" />
      </div>
    </div>
  </div>
);

// Скелетон для слайда презентации
export const SlideSkeleton = () => (
  <div className="aspect-video rounded-xl bg-bg-secondary border border-border-primary p-4">
    <SkeletonPulse className="h-6 w-1/2 mb-4" />
    <div className="space-y-3">
      <SkeletonPulse className="h-4 w-full" />
      <SkeletonPulse className="h-4 w-5/6" />
      <SkeletonPulse className="h-4 w-4/6" />
    </div>
    <SkeletonPulse className="h-24 w-full mt-4 rounded-lg" />
  </div>
);

// Скелетон для Dashboard статистики
export const StatsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="p-4 rounded-xl bg-bg-secondary border border-border-primary text-center">
        <SkeletonPulse className="h-8 w-16 mx-auto mb-2" />
        <SkeletonPulse className="h-4 w-24 mx-auto" />
      </div>
    ))}
  </div>
);

// Скелетон для страницы настроек
export const SettingsSkeleton = () => (
  <div className="space-y-6">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="p-6 rounded-2xl bg-bg-secondary border border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <SkeletonPulse className="h-5 w-32" />
            <SkeletonPulse className="h-4 w-48" />
          </div>
          <SkeletonPulse className="w-12 h-6 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Полноэкранный лоадер
export const FullPageLoader = () => (
  <div className="fixed inset-0 bg-bg-primary flex items-center justify-center z-50">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <motion.div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4"
        animate={{
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <motion.svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.svg>
      </motion.div>
      <motion.p
        className="text-text-secondary"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Загрузка...
      </motion.p>
    </motion.div>
  </div>
);

export default memo(SkeletonPulse);
