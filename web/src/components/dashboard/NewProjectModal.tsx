import { motion, AnimatePresence } from 'framer-motion';
import { NavigateFunction } from 'react-router-dom';
import {
  Sparkles,
  Layers,
  ChevronRight,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: NavigateFunction;
  language: string;
}

const NewProjectModal = ({ isOpen, onClose, navigate, language }: NewProjectModalProps) => {
  const projectTypes = [
    {
      id: 'presentation',
      icon: Layers,
      gradient: 'from-purple-500/20 to-pink-600/20',
      iconGradient: 'from-purple-500 to-pink-600',
      borderColor: 'border-purple-500/30 hover:border-purple-500/60',
      hoverColor: 'group-hover:text-purple-400',
      title: language === 'ru' ? 'Презентация' : 'Presentation',
      description: language === 'ru'
        ? 'Создайте профессиональную презентацию с помощью AI. Автоматическая генерация слайдов, изображений и контента.'
        : 'Create professional presentations with AI. Automatic generation of slides, images, and content.',
      onClick: () => { onClose(); navigate('/presentations'); },
    },
    {
      id: 'dissertation',
      icon: GraduationCap,
      gradient: 'from-emerald-500/20 to-teal-600/20',
      iconGradient: 'from-emerald-500 to-teal-600',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      hoverColor: 'group-hover:text-emerald-400',
      title: language === 'ru' ? 'Диссертация' : 'Dissertation',
      description: language === 'ru'
        ? 'Напишите научную работу с AI-помощником. Автоматическое форматирование, проверка и генерация текста.'
        : 'Write academic papers with AI assistant. Automatic formatting, checking, and text generation.',
      onClick: () => { onClose(); const newId = `dissertation-${Date.now()}`; navigate(`/dissertation/${newId}`); },
    },
    {
      id: 'academic',
      icon: BookOpen,
      gradient: 'from-blue-500/20 to-indigo-600/20',
      iconGradient: 'from-blue-500 to-indigo-600',
      borderColor: 'border-blue-500/30 hover:border-blue-500/60',
      hoverColor: 'group-hover:text-blue-400',
      title: language === 'ru' ? 'Академические работы' : 'Academic Works',
      description: language === 'ru'
        ? 'Эссе, курсовые, рефераты, апелляции. Реальные источники, авто-цитирование и список литературы.'
        : 'Essays, term papers, reports, appeals. Real sources, auto-citations, and bibliography.',
      onClick: () => { onClose(); navigate('/academic'); },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-lg glass rounded-2xl border border-border-primary p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                {language === 'ru' ? 'Создать новый проект' : 'Create New Project'}
              </h2>
              <p className="text-text-muted mt-2">
                {language === 'ru' ? 'Выберите тип проекта' : 'Choose project type'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {projectTypes.map((type) => (
                <motion.button
                  key={type.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={type.onClick}
                  className={`w-full p-6 rounded-xl bg-gradient-to-br ${type.gradient} border ${type.borderColor} transition-all text-left group`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.iconGradient} flex items-center justify-center flex-shrink-0`}>
                      <type.icon size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-primary mb-1">{type.title}</h3>
                      <p className="text-sm text-text-muted">{type.description}</p>
                    </div>
                    <ChevronRight size={20} className={`text-text-muted ${type.hoverColor} transition-colors flex-shrink-0 mt-2`} />
                  </div>
                </motion.button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-6 px-4 py-3 rounded-xl bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
            >
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewProjectModal;
