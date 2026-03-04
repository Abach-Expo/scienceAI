import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';
import { PageTransition } from '../components/Animations';
import {
  Sparkles,
  Layers,
  GraduationCap,
  BookOpen,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

const NewProjectPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const projectTypes = [
    {
      id: 'chat',
      icon: MessageSquare,
      gradient: 'from-violet-500/20 to-indigo-600/20',
      iconGradient: 'from-violet-500 to-indigo-600',
      borderColor: 'border-violet-500/20 hover:border-violet-500/50',
      glowColor: 'violet',
      title: t('newProject.chatTitle'),
      description: t('newProject.chatDesc'),
      onClick: () => {
        if (!isAuthenticated || !user?.isLoggedIn) {
          navigate('/auth', { state: { redirect: '/chat' } });
        } else {
          navigate('/chat');
        }
      },
    },
    {
      id: 'presentation',
      icon: Layers,
      gradient: 'from-purple-500/20 to-pink-600/20',
      iconGradient: 'from-purple-500 to-pink-600',
      borderColor: 'border-purple-500/20 hover:border-purple-500/50',
      glowColor: 'purple',
      title: t('newProject.presentationTitle'),
      description: t('newProject.presentationDesc'),
      onClick: () => {
        if (!isAuthenticated || !user?.isLoggedIn) {
          navigate('/auth', { state: { redirect: '/presentations' } });
        } else {
          navigate('/presentations');
        }
      },
    },
    {
      id: 'dissertation',
      icon: GraduationCap,
      gradient: 'from-emerald-500/20 to-teal-600/20',
      iconGradient: 'from-emerald-500 to-teal-600',
      borderColor: 'border-emerald-500/20 hover:border-emerald-500/50',
      glowColor: 'emerald',
      title: t('newProject.dissertationTitle'),
      description: t('newProject.dissertationDesc'),
      onClick: () => {
        if (!isAuthenticated || !user?.isLoggedIn) {
          navigate('/auth', { state: { redirect: '/workspace-setup?type=dissertation' } });
        } else {
          navigate('/workspace-setup?type=dissertation');
        }
      },
    },
    {
      id: 'academic',
      icon: BookOpen,
      gradient: 'from-blue-500/20 to-sky-600/20',
      iconGradient: 'from-blue-500 to-sky-600',
      borderColor: 'border-blue-500/20 hover:border-blue-500/50',
      glowColor: 'blue',
      title: t('newProject.academicTitle'),
      description: t('newProject.academicDesc'),
      onClick: () => {
        if (!isAuthenticated || !user?.isLoggedIn) {
          navigate('/auth', { state: { redirect: '/workspace-setup?type=academic' } });
        } else {
          navigate('/workspace-setup?type=academic');
        }
      },
    },
  ];

  return (
    <PageTransition className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/[0.07] rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/[0.07] rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-violet-500/[0.05] rounded-full blur-[100px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl frosted-panel border border-white/[0.06] text-text-secondary hover:text-text-primary hover:border-purple-500/30 transition-all group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">{t('common.back')}</span>
      </motion.button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/30"
          >
            <Sparkles size={36} className="text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            {t('newProject.title')}
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            {t('newProject.subtitle')}
          </p>
        </motion.div>

        {/* Project type cards */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5">
          {projectTypes.map((type, index) => (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={type.onClick}
              onMouseEnter={() => setHoveredId(type.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative p-6 md:p-8 rounded-2xl bg-gradient-to-br ${type.gradient} border ${type.borderColor} transition-all text-left group backdrop-blur-sm overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl`}
            >
              {/* Hover glow */}
              <AnimatePresence>
                {hoveredId === type.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-50`}
                  />
                )}
              </AnimatePresence>

              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.iconGradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <type.icon size={28} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
                      {type.title}
                      <ChevronRight
                        size={18}
                        className="text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all"
                      />
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed">{type.description}</p>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-sm text-text-muted text-center"
        >
          {t('newProject.hint')}
        </motion.p>
      </div>
    </PageTransition>
  );
};

export default NewProjectPage;
