import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

const colors = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
];

const ConfettiPiece = ({ piece }: { piece: ConfettiPiece }) => (
  <motion.div
    initial={{
      x: piece.x,
      y: -20,
      rotate: 0,
      opacity: 1,
    }}
    animate={{
      x: piece.x + (Math.random() - 0.5) * 200,
      y: window.innerHeight + 50,
      rotate: piece.rotation * 360,
      opacity: [1, 1, 0],
    }}
    transition={{
      duration: 3 + Math.random() * 2,
      delay: piece.delay,
      ease: 'easeOut',
    }}
    style={{
      position: 'fixed',
      width: piece.size,
      height: piece.size * 0.6,
      backgroundColor: piece.color,
      borderRadius: 2,
      zIndex: 9999,
    }}
  />
);

export const Confetti = ({ 
  isActive, 
  onComplete 
}: { 
  isActive: boolean; 
  onComplete?: () => void;
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = [];
      
      for (let i = 0; i < 100; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: 0,
          rotation: Math.random() * 5 - 2.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 8 + Math.random() * 8,
          delay: Math.random() * 0.5,
        });
      }
      
      setPieces(newPieces);
      
      // Очистка через 5 секунд
      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {pieces.map(piece => (
        <ConfettiPiece key={piece.id} piece={piece} />
      ))}
    </AnimatePresence>
  );
};

// Hook для запуска конфетти
export const useConfetti = () => {
  const [isActive, setIsActive] = useState(false);

  const fire = useCallback(() => {
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    fire,
    stop,
    Confetti: () => <Confetti isActive={isActive} onComplete={stop} />,
  };
};

// Компонент для достижений
interface AchievementProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
}

export const AchievementPopup = ({
  title,
  description,
  icon,
  isVisible,
  onClose,
}: AchievementProps) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <Confetti isActive={true} />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9998]"
          >
            <div className="relative px-8 py-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-xl shadow-2xl">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-xl" />
              
              <div className="relative flex items-center gap-4">
                {icon && (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg"
                  >
                    {icon}
                  </motion.div>
                )}
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs font-medium text-purple-300 uppercase tracking-wider mb-1"
                  >
                    🎉 Достижение разблокировано!
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-bold text-white"
                  >
                    {title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-text-secondary text-sm"
                  >
                    {description}
                  </motion.p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook для системы достижений
export const useAchievements = () => {
  const [achievement, setAchievement] = useState<{
    title: string;
    description: string;
    icon?: React.ReactNode;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const unlock = useCallback((data: typeof achievement) => {
    // Проверяем, не было ли это достижение уже получено
    const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
    if (achievements.includes(data?.title)) return;
    
    // Сохраняем достижение
    localStorage.setItem('achievements', JSON.stringify([...achievements, data?.title]));
    
    // Показываем popup
    setAchievement(data);
    setIsVisible(true);
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setAchievement(null), 500);
  }, []);

  return {
    unlock,
    AchievementPopup: achievement ? (
      <AchievementPopup
        {...achievement}
        isVisible={isVisible}
        onClose={close}
      />
    ) : null,
  };
};

export default Confetti;
