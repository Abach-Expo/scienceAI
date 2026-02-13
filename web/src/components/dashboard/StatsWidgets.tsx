import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  Calendar,
  PenTool,
  Zap,
  Flame,
  Lightbulb,
} from 'lucide-react';

interface StatsData {
  totalProjects: number;
  thisWeek: number;
  wordsWritten: number;
  aiRequests: number;
  streak: number;
}

interface StatsWidgetsProps {
  showWidgets: boolean;
  stats: StatsData;
  tipText: string;
  t: (key: string) => string;
}

const StatsWidgets = ({ showWidgets, stats, tipText, t }: StatsWidgetsProps) => {
  const widgets = [
    {
      value: stats.totalProjects,
      label: t('dashboard.stats.totalProjects'),
      icon: Folder,
      gradient: 'from-purple-500 to-pink-500',
      delay: 0,
    },
    {
      value: stats.thisWeek,
      label: t('dashboard.stats.thisWeek'),
      icon: Calendar,
      gradient: 'from-blue-500 to-cyan-500',
      delay: 0.1,
    },
    {
      value: stats.wordsWritten.toLocaleString(),
      label: t('dashboard.stats.wordsWritten'),
      icon: PenTool,
      gradient: 'from-green-500 to-emerald-500',
      delay: 0.2,
    },
    {
      value: stats.aiRequests,
      label: t('dashboard.stats.aiRequests'),
      icon: Zap,
      gradient: 'from-amber-500 to-orange-500',
      delay: 0.3,
    },
    {
      value: stats.streak,
      label: t('dashboard.stats.streak'),
      icon: Flame,
      gradient: 'from-red-500 to-rose-500',
      delay: 0.4,
    },
  ];

  return (
    <AnimatePresence>
      {showWidgets && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 overflow-hidden"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
            {widgets.map((widget, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: widget.delay }}
                className="p-3 md:p-4 rounded-xl glass border border-border-primary hover:border-accent-primary/30 transition-all"
              >
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${widget.gradient} flex items-center justify-center flex-shrink-0`}>
                    <widget.icon size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg md:text-2xl font-bold text-text-primary">{widget.value}</p>
                    <p className="text-xs text-text-muted truncate">{widget.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tip of the day */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-400 font-medium mb-0.5">{t('dashboard.tips.title')}</p>
                <p className="text-sm text-text-primary">{tipText}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatsWidgets;
