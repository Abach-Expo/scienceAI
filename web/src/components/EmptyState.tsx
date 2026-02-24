import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../store/languageStore';
import { 
  MessageSquare, 
  Layers, 
  FileText, 
  Plus,
  Sparkles,
  Rocket,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

interface EmptyStateProps {
  type: 'all' | 'chats' | 'presentations' | 'dissertations' | 'search' | 'generic';
  onAction?: () => void;
  searchQuery?: string;
}

const EmptyState = ({ type, onAction, searchQuery }: EmptyStateProps) => {
  const { t } = useTranslation();
  const configs = {
    all: {
      icon: Rocket,
      title: t('emptyState.allTitle'),
      description: t('emptyState.allDesc'),
      buttonText: t('emptyState.allButton'),
      gradient: 'from-purple-500 to-pink-600',
      tips: [t('emptyState.allTip1'), t('emptyState.allTip2'), t('emptyState.allTip3')],
    },
    chats: {
      icon: MessageSquare,
      title: t('emptyState.chatsTitle'),
      description: t('emptyState.chatsDesc'),
      buttonText: t('emptyState.chatsButton'),
      gradient: 'from-blue-500 to-cyan-600',
      tips: [t('emptyState.chatsTip1'), t('emptyState.chatsTip2'), t('emptyState.chatsTip3')],
    },
    presentations: {
      icon: Layers,
      title: t('emptyState.presentationsTitle'),
      description: t('emptyState.presentationsDesc'),
      buttonText: t('emptyState.presentationsButton'),
      gradient: 'from-purple-500 to-violet-600',
      tips: [t('emptyState.presentationsTip1'), t('emptyState.presentationsTip2'), t('emptyState.presentationsTip3')],
    },
    dissertations: {
      icon: FileText,
      title: t('emptyState.dissertationsTitle'),
      description: t('emptyState.dissertationsDesc'),
      buttonText: t('emptyState.dissertationsButton'),
      gradient: 'from-emerald-500 to-teal-600',
      tips: [t('emptyState.dissertationsTip1'), t('emptyState.dissertationsTip2'), t('emptyState.dissertationsTip3')],
    },
    search: {
      icon: Lightbulb,
      title: searchQuery ? `${t('emptyState.searchTitle')} "${searchQuery}"` : t('emptyState.searchLabel'),
      description: t('emptyState.searchDesc'),
      buttonText: t('emptyState.searchButton'),
      gradient: 'from-amber-500 to-orange-600',
      tips: [],
    },
    generic: {
      icon: Sparkles,
      title: t('emptyState.genericTitle'),
      description: t('emptyState.genericDesc'),
      buttonText: t('emptyState.genericButton'),
      gradient: 'from-purple-500 to-pink-600',
      tips: [],
    },
  };

  const config = configs[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="relative mb-8"
      >
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
          style={{
            boxShadow: `0 20px 40px -10px rgba(139, 92, 246, 0.3)`,
          }}
        >
          <config.icon size={48} className="text-white" />
        </motion.div>
        
        {/* Decorative elements */}
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-0 -z-10"
        >
          <div className="absolute -top-4 -right-4 w-4 h-4 rounded-full bg-purple-400/40" />
          <div className="absolute -bottom-2 -left-6 w-3 h-3 rounded-full bg-pink-400/40" />
          <div className="absolute top-1/2 -right-8 w-2 h-2 rounded-full bg-cyan-400/40" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-text-primary mb-3 text-center"
      >
        {config.title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-text-secondary text-center max-w-md mb-6"
      >
        {config.description}
      </motion.p>

      {/* Tips */}
      {config.tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8 space-y-2"
        >
          {config.tips.map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3 text-text-muted text-sm"
            >
              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${config.gradient}`} />
              {tip}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Action Button */}
      {onAction && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className={`px-8 py-4 rounded-2xl bg-gradient-to-r ${config.gradient} text-white font-semibold flex items-center gap-3 shadow-lg`}
          style={{
            boxShadow: `0 10px 30px -5px rgba(139, 92, 246, 0.4)`,
          }}
        >
          <Plus size={22} />
          {config.buttonText}
          <ArrowRight size={18} />
        </motion.button>
      )}
    </motion.div>
  );
};

export default memo(EmptyState);
