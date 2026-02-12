import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavigateFunction } from 'react-router-dom';
import { Star, Trash2, MoreHorizontal } from 'lucide-react';

interface ChatItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  type: 'chat' | 'presentation' | 'dissertation';
  starred?: boolean;
}

interface ItemCardProps {
  item: ChatItem;
  onDelete: (id: string, type: string) => void;
  onToggleStar: (id: string, type: string) => void;
  formatTime: (date: Date) => string;
  getTypeIcon: (type: string) => JSX.Element;
  getTypeLabel: (type: string) => string;
  navigate: NavigateFunction;
  t: (key: string) => string;
}

const ItemCard = memo(({
  item,
  onDelete,
  onToggleStar,
  formatTime,
  getTypeIcon,
  getTypeLabel,
  navigate,
  t,
}: ItemCardProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    if (item.type === 'presentation') {
      navigate(`/presentations/${item.id}`);
    } else if (item.type === 'chat') {
      navigate(`/chat/${item.id}`);
    } else {
      navigate(`/dissertation/${item.id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative p-4 rounded-xl glass border border-border-primary hover:border-accent-primary/30 transition-all cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0">
          {getTypeIcon(item.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-text-primary truncate">{item.title}</h4>
            {item.starred && <Star size={14} className="text-amber-400 fill-amber-400" />}
          </div>
          <p className="text-sm text-text-muted truncate">{item.lastMessage}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted hidden sm:block">{formatTime(item.timestamp)}</span>
          <span className="text-xs px-2 py-1 rounded-lg bg-bg-tertiary text-text-secondary">
            {getTypeLabel(item.type)}
          </span>
          
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={18} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 py-2 rounded-xl glass border border-border-primary shadow-xl z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { onToggleStar(item.id, item.type); setShowMenu(false); }}
                    className="w-full px-4 py-2 flex items-center gap-2 text-sm text-text-secondary hover:bg-bg-tertiary transition-all"
                  >
                    <Star size={14} className={item.starred ? 'text-amber-400 fill-amber-400' : ''} />
                    {item.starred ? t('dashboard.removeFromFavorites') : t('dashboard.addToFavorites')}
                  </button>
                  <button
                    onClick={() => { onDelete(item.id, item.type); setShowMenu(false); }}
                    className="w-full px-4 py-2 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                    {t('common.delete')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ItemCard.displayName = 'ItemCard';

export default ItemCard;
