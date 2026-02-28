import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

import {
  Sparkles,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Loader2,
  Github,
  AlertCircle,
} from 'lucide-react';
import { AlertModal } from '../components/ConfirmModal';
import { API_URL } from '../config';
import { GOOGLE_CLIENT_ID } from '../config';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';

// Интерфейс для ответа API
interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    provider?: string;
    apiCallsCount?: number;
    tokensUsed?: number;
  };
}

const AuthPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  useDocumentTitle(mode === 'login' ? t('auth.authTitle') : t('auth.registerTitle'));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'code' | 'done'>('email');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const googleInitialized = useRef(false);

  // Сохранение данных авторизации
  const saveAuthData = useCallback((data: AuthResponse) => {
    useAuthStore.getState().login(data.token, data.user, data.refreshToken);
  }, []);

  // Callback после успешной авторизации через Google
  const handleGoogleCallback = useCallback(async (response: { credential?: string }) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        const debugInfo = data.debug ? ` [Debug: ${data.debug}]` : '';
        throw new Error((data.message || data.error || t('auth.googleAuthError')) + debugInfo);
      }

      // Сохраняем токен и данные пользователя
      const authData = data.data || data;
      saveAuthData(authData);
      
      if (!localStorage.getItem('profile_completed')) {
        navigate('/profile-setup');
      } else {
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.googleAuthFailed');
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, saveAuthData]);

  // Инициализация Google Sign-In
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (!GOOGLE_CLIENT_ID || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        ux_mode: 'popup',
      });

      // Рендерим кнопку Google в контейнер (оверлей поверх кастомной кнопки)
      const renderBtn = () => {
        if (googleButtonRef.current) {
          window.google?.accounts.id.renderButton(
            googleButtonRef.current,
            {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              width: googleButtonRef.current.offsetWidth || 400,
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            }
          );
        }
      };

      // Ref может быть ещё не привязан — пробуем с задержкой
      renderBtn();
      setTimeout(renderBtn, 300);

      googleInitialized.current = true;
    };

    // Загружаем Google Identity Services
    if (document.getElementById('google-identity-script')) {
      // Скрипт уже загружен — инициализируем сразу
      initializeGoogleSignIn();
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.body.appendChild(script);

    return () => {
      googleInitialized.current = false;
    };
  }, [handleGoogleCallback]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (mode === 'register' && !formData.name.trim()) {
      newErrors.name = t('auth.validationNameRequired');
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('auth.validationEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.validationEmailInvalid');
    }
    
    if (!formData.password) {
      newErrors.password = t('auth.validationPasswordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.validationPasswordShort');
    } else if (mode === 'register' && !/[A-Z]/.test(formData.password)) {
      newErrors.password = t('auth.validationPasswordUppercase');
    } else if (mode === 'register' && !/[0-9]/.test(formData.password)) {
      newErrors.password = t('auth.validationPasswordNumber');
    }
    
    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.validationPasswordsMismatch');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setServerError(null);
    
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login' 
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors array from backend
        if (data.errors && Array.isArray(data.errors)) {
          const firstError = data.errors[0];
          throw new Error(firstError?.msg || firstError?.message || t('auth.authError'));
        }
        throw new Error(data.message || data.error || t('auth.authError'));
      }

      // Сохраняем токен и данные пользователя (формат: {success, data: {user, token}})
      const authData = data.data || data;
      saveAuthData(authData);
      navigate('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.genericError');
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Левая часть - Форма */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Лого */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="text-white" size={26} />
            </div>
            <span className="text-2xl font-bold text-text-primary">Science AI</span>
          </div>

          {/* Заголовок */}
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h1>
          <p className="text-text-muted mb-8">
            {mode === 'login' 
              ? t('auth.loginSubtitle') 
              : t('auth.registerSubtitle')}
          </p>

          {/* Социальные кнопки */}
          <div className="space-y-3 mb-6">
            {/* Google Sign-In кнопка с оверлеем */}
            <div className="relative w-full">
              {/* Визуальная кнопка (декоративная) */}
              <div className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium shadow-sm pointer-events-none" aria-label={t('auth.loginWithGoogle')}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('auth.loginWithGoogle')}
              </div>
              {/* Настоящая кнопка Google поверх (невидимая, но кликабельная) */}
              <div
                ref={googleButtonRef}
                className="absolute inset-0 overflow-hidden rounded-xl"
                style={{ opacity: 0.01, zIndex: 2 }}
              />
            </div>
          </div>

          {/* Разделитель */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border-primary" />
            <span className="text-text-muted text-sm">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-border-primary" />
          </div>

          {/* Ошибка сервера */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
              >
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm">{serverError}</p>
                  <button
                    onClick={() => setServerError(null)}
                    className="text-red-300 text-xs hover:underline mt-1"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-4" aria-label={mode === 'login' ? t('auth.loginFormLabel') : t('auth.registerFormLabel')}>
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="auth-name" className="block text-sm font-medium text-text-secondary mb-2">
                    {t('auth.name')}
                  </label>
                  <div className="relative">
                    <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      id="auth-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('auth.namePlaceholder')}
                      className={`w-full pl-12 pr-4 py-3 rounded-xl glass border ${errors.name ? 'border-red-500' : 'border-border-primary'} text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all`}
                    />
                  </div>
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="auth-email"
                  data-testid="auth-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl glass border ${errors.email ? 'border-red-500' : 'border-border-primary'} text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all`}
                />
              </div>
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="auth-password"
                  data-testid="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3 rounded-xl glass border ${errors.password ? 'border-red-500' : 'border-border-primary'} text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="toggle-password"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
            </div>

            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-text-secondary mb-2">
                    {t('auth.confirmPassword')}
                  </label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      id="auth-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl glass border ${errors.confirmPassword ? 'border-red-500' : 'border-border-primary'} text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all`}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            {mode === 'login' && (
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setForgotPasswordModal(true)}
                  className="text-sm text-accent-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              data-testid="auth-submit-button"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? t('auth.loginButton') : t('auth.createAccount')}
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>

          {/* Переключение режима */}
          <p className="text-center text-text-muted mt-6">
            {mode === 'login' ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrors({});
              }}
              className="text-accent-primary hover:underline ml-2"
            >
              {mode === 'login' ? t('auth.registerButton') : t('auth.loginButton')}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Правая часть - Декоративная */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              {t('auth.heroTitle')}
              <span className="block text-2xl text-text-secondary mt-2">{t('auth.heroSubtitleLine')}</span>
            </h2>
            <p className="text-text-secondary text-lg mb-8">
              {t('auth.heroDescription')}
            </p>

            {/* Features */}
            <div className="space-y-4 text-left">
              {[
                t('auth.feature1'),
                t('auth.feature2'),
                t('auth.feature3'),
                t('auth.feature4'),
                t('auth.feature5'),
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-success/20 flex items-center justify-center">
                    <Check size={14} className="text-accent-success" />
                  </div>
                  <span className="text-text-primary">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {forgotPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setForgotPasswordModal(false);
                setForgotPasswordStep('email');
                setForgotPasswordEmail('');
                setResetCode('');
                setNewPassword('');
                setNewPasswordConfirm('');
                setResetError('');
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-bg-secondary border border-border-primary p-6"
            >
              {/* Step 1: Enter email */}
              {forgotPasswordStep === 'email' && (
                <>
                  <h3 className="text-xl font-bold text-text-primary mb-2">{t('auth.passwordRecovery')}</h3>
                  <p className="text-text-muted text-sm mb-4">
                    {t('auth.passwordRecoveryDesc')}
                  </p>
                  {resetError && (
                    <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {resetError}
                    </div>
                  )}
                  <div className="relative mb-4">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-12 pr-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && forgotPasswordEmail && document.getElementById('btn-send-code')?.click()}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setForgotPasswordModal(false);
                        setForgotPasswordEmail('');
                        setResetError('');
                      }}
                      className="flex-1 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-secondary text-text-primary font-medium transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      id="btn-send-code"
                      disabled={resetLoading || !forgotPasswordEmail}
                      onClick={async () => {
                        if (forgotPasswordEmail) {
                          setResetLoading(true);
                          setResetError('');
                          try {
                            await fetch(`${API_URL}/auth/forgot-password`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: forgotPasswordEmail }),
                            });
                          } catch (e) {
                            // Ignore - always proceed to code step for security
                          }
                          setResetLoading(false);
                          setForgotPasswordStep('code');
                        }
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {resetLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                      {t('auth.sendCode')}
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Enter code + new password */}
              {forgotPasswordStep === 'code' && (
                <>
                  <h3 className="text-xl font-bold text-text-primary mb-2">{t('auth.enterCode')}</h3>
                  <p className="text-text-muted text-sm mb-4">
                    {t('auth.codeSentTo')} <span className="text-accent-primary">{forgotPasswordEmail}</span>{t('auth.codeSentSuffix')}
                  </p>
                  {resetError && (
                    <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      {resetError}
                    </div>
                  )}
                  
                  {/* Code input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.confirmationCode')}</label>
                    <input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all text-center text-2xl tracking-[0.5em] font-mono"
                    />
                  </div>

                  {/* New password */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.newPassword')}</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('auth.validationPasswordShort')}
                        className="w-full pl-12 pr-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-2">{t('auth.confirmPassword')}</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder={t('auth.repeatPassword')}
                        className="w-full pl-12 pr-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setForgotPasswordStep('email');
                        setResetCode('');
                        setNewPassword('');
                        setNewPasswordConfirm('');
                        setResetError('');
                      }}
                      className="flex-1 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-secondary text-text-primary font-medium transition-all"
                    >
                      {t('common.back')}
                    </button>
                    <button
                      disabled={resetLoading || resetCode.length !== 6 || newPassword.length < 6 || newPassword !== newPasswordConfirm}
                      onClick={async () => {
                        setResetError('');
                        if (newPassword !== newPasswordConfirm) {
                          setResetError(t('auth.validationPasswordsMismatch'));
                          return;
                        }
                        if (newPassword.length < 6) {
                          setResetError(t('auth.validationPasswordShort'));
                          return;
                        }
                        setResetLoading(true);
                        try {
                          const res = await fetch(`${API_URL}/auth/reset-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: forgotPasswordEmail, code: resetCode, newPassword }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            throw new Error(data.message || t('auth.resetPasswordError'));
                          }
                          setForgotPasswordStep('done');
                        } catch (error: unknown) {
                          const message = error instanceof Error ? error.message : t('auth.invalidCode');
                          setResetError(message);
                        } finally {
                          setResetLoading(false);
                        }
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {resetLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                      {t('auth.resetPassword')}
                    </button>
                  </div>

                  {/* Resend code */}
                  <button
                    onClick={async () => {
                      try {
                        await fetch(`${API_URL}/auth/forgot-password`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: forgotPasswordEmail }),
                        });
                        setResetError('');
                      } catch {}
                    }}
                    className="w-full mt-3 text-sm text-accent-primary hover:underline text-center"
                  >
                    {t('auth.resendCode')}
                  </button>
                </>
              )}

              {/* Step 3: Success */}
              {forgotPasswordStep === 'done' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">{t('auth.passwordChanged')}</h3>
                  <p className="text-text-muted text-sm mb-4">
                    {t('auth.passwordChangedDesc')}
                  </p>
                  <button
                    onClick={() => {
                      setForgotPasswordModal(false);
                      setForgotPasswordStep('email');
                      setForgotPasswordEmail('');
                      setResetCode('');
                      setNewPassword('');
                      setNewPasswordConfirm('');
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium transition-all"
                  >
                    {t('auth.loginButton')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
