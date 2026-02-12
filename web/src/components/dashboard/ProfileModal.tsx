import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';

interface UserData {
  name: string;
  email: string;
  isLoggedIn: boolean;
  createdAt?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData;
  itemsCount: number;
  starredCount: number;
  navigate: NavigateFunction;
  t: (key: string) => string;
  language: string;
}

const ProfileModal = ({
  isOpen,
  onClose,
  user,
  itemsCount,
  starredCount,
  navigate,
  t,
  language,
}: ProfileModalProps) => {
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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md glass rounded-2xl border border-border-primary p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                <User size={40} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">{user.name}</h2>
              <p className="text-text-muted">{user.email}</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-bg-tertiary">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">{language === 'ru' ? 'Проекты' : 'Projects'}</span>
                  <span className="font-semibold text-text-primary">{itemsCount}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">{t('dashboard.starred')}</span>
                  <span className="font-semibold text-text-primary">{starredCount}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-bg-tertiary">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">{language === 'ru' ? 'Дата регистрации' : 'Registered'}</span>
                  <span className="font-semibold text-text-primary">
                    {new Date(user.createdAt || Date.now()).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { onClose(); navigate('/settings'); }}
                className="flex-1 px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition-all"
              >
                {t('common.settings')}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white"
              >
                {t('common.close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
