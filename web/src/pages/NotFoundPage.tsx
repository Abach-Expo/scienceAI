import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, Sparkles } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const NotFoundPage = () => {
  useDocumentTitle('Страница не найдена');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-lg"
      >
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <span className="text-[150px] md:text-[200px] font-black leading-none gradient-text">
            404
          </span>
        </motion.div>

        {/* Message */}
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          Страница не найдена
        </h1>
        <p className="text-text-secondary text-lg mb-8">
          Кажется, эта страница решила уйти на каникулы. 
          Давай вернёмся к чему-то полезному!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Home size={20} />
            На главную
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl glass border border-border-primary text-text-primary font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Назад
          </motion.button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-border-primary">
          <p className="text-text-muted text-sm mb-4">Попробуй эти страницы:</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'Dashboard', path: '/dashboard', icon: Sparkles },
              { label: 'Презентации', path: '/presentations', icon: Search },
              { label: 'Тарифы', path: '/pricing', icon: Search },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
