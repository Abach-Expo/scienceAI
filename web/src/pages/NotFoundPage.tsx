import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, LayoutDashboard, Presentation, CreditCard } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useTranslation } from '../store/languageStore';

const NotFoundPage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('notFound.pageTitle'));
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/[0.08] rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/[0.08] rounded-full blur-[80px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-lg"
      >
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-8"
        >
          <span className="text-[150px] md:text-[200px] font-black leading-none gradient-text drop-shadow-[0_0_40px_rgba(139,92,246,0.3)]">
            404
          </span>
        </motion.div>

        {/* Message */}
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4 tracking-tight">
          {t('notFound.title')}
        </h1>
        <p className="text-text-secondary text-lg mb-8">
          {t('notFound.description')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 btn-ripple"
          >
            <Home size={20} />
            {t('notFound.goHome')}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-bg-tertiary/50 border border-white/[0.08] text-text-primary font-semibold flex items-center justify-center gap-2 hover:border-purple-500/30 transition-colors"
          >
            <ArrowLeft size={20} />
            {t('notFound.goBack')}
          </motion.button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8">
          <div className="separator-gradient mb-6" />
          <p className="text-text-muted text-sm mb-4">{t('notFound.tryPages')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: t('notFound.dashboard'), path: '/dashboard', icon: LayoutDashboard },
              { label: t('notFound.presentations'), path: '/presentations', icon: Presentation },
              { label: t('notFound.pricing'), path: '/pricing', icon: CreditCard },
            ].map((link) => (
              <motion.button
                key={link.path}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(link.path)}
                className="px-4 py-2.5 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary border border-white/[0.06] hover:border-purple-500/30 text-text-secondary hover:text-text-primary transition-all text-sm font-medium flex items-center gap-2"
              >
                <link.icon size={16} />
                {link.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
