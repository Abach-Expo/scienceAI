import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  Sparkles,
  User,
  ArrowRight,
  Check,
  Loader2,
  Camera,
  Mail,
} from 'lucide-react';
import { API_URL } from '../config';
import { useAuthStore } from '../store/authStore';
import { getAuthorizationHeaders } from '../services/apiClient';

const ProfileSetupPage = () => {
  useDocumentTitle('Профиль');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    organization: '',
    position: '',
  });

  const [userData, setUserData] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    // Получаем данные пользователя из authStore
    const authUser = useAuthStore.getState().user;
    const user: Record<string, string> = authUser ? {
      name: authUser.name || '',
      email: authUser.email || '',
      organization: authUser.organization || '',
      position: authUser.position || '',
    } : {};
    setUserData(user);
    
    // Если имя уже есть, разбиваем на имя и фамилию
    if (user.name) {
      const parts = user.name.split(' ');
      setFormData(prev => ({
        ...prev,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
      }));
    }
  }, []);

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Обновляем профиль на сервере
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getAuthorizationHeaders(),
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          organization: formData.organization,
          position: formData.position,
        }),
      });

      if (response.ok) {
        // Обновляем данные в authStore
        useAuthStore.getState().updateUser({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          organization: formData.organization,
          position: formData.position,
        });
      }
      
      // Отмечаем, что профиль настроен
      localStorage.setItem('profile_completed', 'true');
      
      // Переходим на dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('profile_completed', 'true');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Лого */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Sparkles className="text-white" size={32} />
          </div>
        </div>

        {/* Приветствие */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Добро пожаловать, {formData.firstName || 'друг'}! 👋
          </h1>
          <p className="text-text-muted">
            Давайте настроим ваш профиль для лучшего опыта
          </p>
        </div>

        {/* Аватар пользователя */}
        {userData?.avatar && (
          <div className="flex justify-center mb-8">
            <div className="relative">
              <img
                src={userData.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-4 border-accent-primary"
              />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent-success flex items-center justify-center">
                <Check size={16} className="text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Индикатор шагов */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                step >= s ? 'bg-accent-primary w-8' : 'bg-bg-tertiary'
              }`}
            />
          ))}
        </div>

        {/* Форма */}
        <div className="card p-8">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold text-text-primary mb-4">
                Как вас зовут?
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Имя <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ваше имя"
                    className="w-full pl-12 pr-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Фамилия <span className="text-text-muted">(необязательно)</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Ваша фамилия"
                  className="w-full px-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                disabled={!formData.firstName.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Далее
                <ArrowRight size={20} />
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold text-text-primary mb-4">
                Расскажите о себе
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Организация <span className="text-text-muted">(необязательно)</span>
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Университет, компания..."
                  className="w-full px-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Должность / Роль <span className="text-text-muted">(необязательно)</span>
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Студент, преподаватель, исследователь..."
                  className="w-full px-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-xl glass border border-border-primary text-text-primary font-semibold"
                >
                  Назад
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={20} />
                      Завершить
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Кнопка пропустить */}
        <button
          onClick={handleSkip}
          className="w-full mt-4 text-text-muted hover:text-text-primary text-sm transition-colors"
        >
          Пропустить настройку
        </button>
      </motion.div>
    </div>
  );
};

export default ProfileSetupPage;
