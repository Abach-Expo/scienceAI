import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  ArrowLeft,
  Palette,
  Globe,
  Save,
  Check,
  Sparkles,
  CheckCircle,
  Bell,
  Trash2,
  Download,
  Shield,
  User,
  Mail,
  Building,
  Briefcase,
  LogOut,
  Server,
  Crown,
  Zap,
  CreditCard,
  TrendingUp,
  Gift,
  History,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { 
  useSubscriptionStore, 
  SUBSCRIPTION_PLANS, 
  PlanType 
} from '../store/subscriptionStore';
import { useTranslation } from '../store/languageStore';
import ConfirmModal, { AlertModal } from '../components/ConfirmModal';
import PaymentModal from '../components/PaymentModal';
import { API_URL } from '../config';
import { useAuthStore } from '../store/authStore';
import { getAuthorizationHeaders } from '../services/apiClient';
import ReferralProgram from '../components/ReferralProgram';

const SettingsPage = () => {
  useDocumentTitle('Настройки');
  const navigate = useNavigate();
  const subscription = useSubscriptionStore();
  const { language, setLanguage, t } = useTranslation();
  
  // API ключ теперь хранится только на сервере (безопасно)
  
  const [saved, setSaved] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
  const [notifications, setNotifications] = useState(localStorage.getItem('notifications') !== 'false');
  
  // Профиль пользователя
  const [userData, setUserData] = useState<Record<string, string> | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    organization: '',
    position: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Change password
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // API ключ теперь на сервере - не нужна проверка на клиенте

  useEffect(() => {
    const authUser = useAuthStore.getState().user;
    const user: Record<string, string> = authUser ? {
      name: authUser.name || '',
      email: authUser.email || '',
      organization: authUser.organization || '',
      position: authUser.position || '',
    } : {};
    setUserData(user);
    
    if (user.name) {
      const parts = user.name.split(' ');
      setProfileForm({
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        organization: user.organization || '',
        position: user.position || '',
      });
    }
  }, []);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
      
      await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getAuthorizationHeaders(),
        body: JSON.stringify({
          name: fullName,
          organization: profileForm.organization,
          position: profileForm.position,
        }),
      });

      // Обновляем authStore
      useAuthStore.getState().updateUser({ name: fullName, organization: profileForm.organization, position: profileForm.position });
      const user = { ...userData, name: fullName, organization: profileForm.organization, position: profileForm.position };
      setUserData(user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      // error handled by UI
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/');
  };

  const handleSave = () => {
    // API ключ хранится на сервере - не сохраняем на клиенте
    localStorage.setItem('app_theme', theme);
    localStorage.setItem('notifications', notifications.toString());
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Modal states
  const [clearDataModal, setClearDataModal] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; planId: PlanType | null; plan: { name: string; price: number } | null }>({ open: false, planId: null, plan: null });
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; planId: PlanType; isRenewal?: boolean }>({ open: false, planId: 'starter' });
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  const handleClearData = () => {
    setClearDataModal(true);
  };

  const confirmClearData = () => {
    localStorage.clear();
    navigate('/');
    window.location.reload();
  };

  const handleExportData = () => {
    let chats = [];
    let presentations = [];
    let dissertations = [];
    
    try { chats = JSON.parse(localStorage.getItem('chats') || '[]'); } catch (e) { chats = []; }
    try { presentations = JSON.parse(localStorage.getItem('presentations') || '[]'); } catch (e) { presentations = []; }
    try { dissertations = JSON.parse(localStorage.getItem('dissertations') || '[]'); } catch (e) { dissertations = []; }
    
    const data = {
      chats,
      presentations,
      dissertations,
      settings: {
        language,
        theme,
        notifications,
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `science-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-4 md:px-6 py-4 border-b border-border-primary bg-bg-secondary/50 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl glass border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">{t('settings.title')}</h1>
              <p className="text-xs text-text-muted">{t('settings.appConfiguration')}</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <User size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-primary">{t('settings.profile')}</h2>
              <p className="text-sm text-text-muted">{t('settings.profileDesc')}</p>
            </div>
            {userData?.avatar && (
              <img src={userData.avatar} alt="Avatar" className="w-12 h-12 rounded-full" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-text-secondary mb-2">
                {t('settings.firstName')}
              </label>
              <input
                id="firstName"
                type="text"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                placeholder={t('settings.firstNamePlaceholder')}
                className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-text-secondary mb-2">
                {t('settings.lastName')}
              </label>
              <input
                id="lastName"
                type="text"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                placeholder={t('settings.lastNamePlaceholder')}
                className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-text-secondary mb-2">
                <Building size={14} className="inline mr-1" />
                {t('settings.organization')}
              </label>
              <input
                id="organization"
                type="text"
                value={profileForm.organization}
                onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })}
                placeholder={t('settings.organizationPlaceholder')}
                className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-text-secondary mb-2">
                <Briefcase size={14} className="inline mr-1" />
                {t('settings.position')}
              </label>
              <input
                id="position"
                type="text"
                value={profileForm.position}
                onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                placeholder={t('settings.positionPlaceholder')}
                className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>
          </div>

          {/* Email (readonly) */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
              <Mail size={14} className="inline mr-1" />
              {t('settings.email')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="email"
                type="email"
                value={userData?.email || ''}
                disabled
                className="flex-1 px-4 py-3 rounded-xl bg-bg-tertiary border border-border-primary text-text-muted cursor-not-allowed"
              />
              {userData?.provider === 'google' && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                  Google
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center gap-2"
            >
              {profileSaving ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Save size={18} />
              )}
              {profileSaving ? t('settings.saving') : t('settings.saveProfile')}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold flex items-center gap-2 hover:bg-red-500/30"
            >
              <LogOut size={18} />
              {t('common.logout')}
            </motion.button>
          </div>
        </motion.div>

        {/* Change Password Section */}
        {userData?.provider !== 'google' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <KeyRound size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t('settings.changePassword')}</h2>
                <p className="text-sm text-text-muted">{t('settings.changePasswordDesc')}</p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
                <Check size={16} />
                {t('settings.passwordChanged')}
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('settings.currentPassword')}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="current-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-bg-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('settings.newPassword')}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="new-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.newPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-bg-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="confirm-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    placeholder={t('settings.repeatPasswordPlaceholder')}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-bg-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={passwordSaving || !passwordForm.current || !passwordForm.newPass || !passwordForm.confirm}
              onClick={async () => {
                setPasswordError('');
                setPasswordSuccess(false);
                if (passwordForm.newPass.length < 6) {
                  setPasswordError(t('auth.validationPasswordShort'));
                  return;
                }
                if (passwordForm.newPass !== passwordForm.confirm) {
                  setPasswordError(t('auth.validationPasswordsMismatch'));
                  return;
                }
                setPasswordSaving(true);
                try {
                  const res = await fetch(`${API_URL}/auth/change-password`, {
                    method: 'POST',
                    headers: getAuthorizationHeaders(),
                    body: JSON.stringify({
                      currentPassword: passwordForm.current,
                      newPassword: passwordForm.newPass,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.message || 'Error');
                  setPasswordSuccess(true);
                  setPasswordForm({ current: '', newPass: '', confirm: '' });
                  setTimeout(() => setPasswordSuccess(false), 5000);
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : t('settings.passwordChangeError');
                  setPasswordError(message);
                } finally {
                  setPasswordSaving(false);
                }
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {passwordSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <KeyRound size={18} />
              )}
              {t('settings.changePassword')}
            </motion.button>
          </motion.div>
        )}

        {/* Subscription Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
              subscription.currentPlan === 'premium' ? 'from-amber-500 to-orange-600' :
              subscription.currentPlan === 'pro' ? 'from-purple-500 to-pink-600' :
              subscription.currentPlan === 'starter' ? 'from-blue-500 to-cyan-600' :
              'from-blue-500 to-cyan-600'
            } flex items-center justify-center`}>
              {subscription.currentPlan === 'premium' ? <Crown size={24} className="text-white" /> :
               subscription.currentPlan === 'pro' ? <Crown size={24} className="text-white" /> :
               <Zap size={24} className="text-white" />}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-primary">{t('settings.subscription')}</h2>
              <p className="text-sm text-text-muted">{t('settings.subscriptionDesc')}</p>
            </div>
            
            {/* Button to subscription page */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-shadow"
            >
              <Crown size={16} />
              {t('settings.managePlan')}
              <ChevronRight size={16} />
            </motion.button>
          </div>

          {/* Current Plan Card */}
          <div className={`p-5 rounded-xl border-2 mb-6 ${
            subscription.currentPlan === 'premium' ? 'border-amber-500/50 bg-amber-500/10' :
            subscription.currentPlan === 'pro' ? 'border-purple-500/50 bg-purple-500/10' :
            subscription.currentPlan === 'starter' ? 'border-blue-500/50 bg-blue-500/10' :
            'border-border-secondary bg-bg-secondary'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                  subscription.currentPlan === 'premium' ? 'from-amber-500 to-orange-600' :
                  subscription.currentPlan === 'pro' ? 'from-purple-500 to-pink-600' :
                  subscription.currentPlan === 'starter' ? 'from-blue-500 to-cyan-600' :
                  'from-blue-500 to-cyan-600'
                } flex items-center justify-center`}>
                  {subscription.currentPlan === 'premium' ? <Crown size={28} className="text-white" /> :
                   subscription.currentPlan === 'pro' ? <Crown size={28} className="text-white" /> :
                   <Sparkles size={28} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">
                    {(SUBSCRIPTION_PLANS[subscription.currentPlan] || SUBSCRIPTION_PLANS.starter).name}
                  </h3>
                  <p className="text-sm text-text-muted">
                    ${(SUBSCRIPTION_PLANS[subscription.currentPlan] || SUBSCRIPTION_PLANS.starter).price}/мес
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-text-primary">
                  {subscription.currentPlan === 'starter' ? 'Starter' :
                   subscription.currentPlan === 'premium' ? 'Maximum' : 
                   subscription.currentPlan === 'pro' ? 'Pro' : 'Нет плана'}
                </div>
                <p className="text-sm text-text-muted">
                  {subscription.currentPlan ? 'активен' : 'не активен'}
                </p>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-2">
              {(SUBSCRIPTION_PLANS[subscription.currentPlan] || SUBSCRIPTION_PLANS.starter).features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check size={14} className="text-green-400" />
                  {feature}
                </div>
              ))}
            </div>

            {/* Usage Progress & Renew Button */}
            {subscription.currentPlan && (
              <div className="mt-4 pt-4 border-t border-border-primary">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-text-muted">Использовано лимитов</span>
                  <span className="text-sm font-bold text-text-primary">
                    {subscription.getUsagePercentage().overall}%
                  </span>
                </div>
                
                {/* Usage bars */}
                <div className="space-y-2 mb-4">
                  {Object.entries(subscription.getUsagePercentage().details).map(([key, percent]) => {
                    if (percent === 0) return null;
                    const labels: Record<string, string> = {
                      presentations: 'Презентации',
                      dalleImages: 'AI-картинки',
                      dissertations: 'AI генерации',
                      chapters: 'Главы (20+ стр)',
                    };
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-text-muted mb-1">
                          <span>{labels[key] || key}</span>
                          <span className={percent >= 80 ? 'text-red-400' : 'text-green-400'}>{percent}%</span>
                        </div>
                        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              percent >= 80 ? 'bg-red-500' : percent >= 50 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Renew Button */}
                {(() => {
                  const renewStatus = subscription.canRenewPlan();
                  return (
                    <motion.button
                      whileHover={{ scale: renewStatus.canRenew ? 1.02 : 1 }}
                      whileTap={{ scale: renewStatus.canRenew ? 0.98 : 1 }}
                      onClick={() => {
                        if (renewStatus.canRenew) {
                          setPaymentModal({ open: true, planId: subscription.currentPlan, isRenewal: true });
                        }
                      }}
                      disabled={!renewStatus.canRenew}
                      className={`w-full p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        renewStatus.canRenew 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25' 
                          : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                      }`}
                    >
                      <Zap size={18} />
                      <span className="font-medium">
                        {renewStatus.canRenew 
                          ? 'Обновить подписку (сброс лимитов)'
                          : renewStatus.reason || `Осталось ${renewStatus.daysLeft} дней`
                        }
                      </span>
                    </motion.button>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Upgrade/Buy Tokens Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {subscription.currentPlan !== 'premium' && (
              <>
                {(Object.entries(SUBSCRIPTION_PLANS) as [PlanType, typeof SUBSCRIPTION_PLANS[PlanType]][])
                  .filter(([id]) => {
                    const order = ['starter', 'pro', 'premium'];
                    return order.indexOf(id) > order.indexOf(subscription.currentPlan);
                  })
                  .slice(0, 2)
                  .map(([planId, plan]) => (
                    <motion.button
                      key={planId}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setPaymentModal({ open: true, planId: planId as PlanType });
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        planId === 'pro' ? 'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20' :
                        'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                        planId === 'pro' ? 'from-purple-500 to-pink-600' :
                        'from-blue-500 to-cyan-600'
                      } flex items-center justify-center`}>
                        {planId === 'pro' ? <Crown size={20} className="text-white" /> :
                         <Sparkles size={20} className="text-white" />}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-text-primary">{plan.name}</div>
                        <div className="text-xs text-text-muted">
                          ${plan.price}/мес
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-text-muted" />
                    </motion.button>
                  ))}
              </>
            )}
          </div>

          {/* Transaction History - simplified */}
          <div className="mt-4">
            <button
              onClick={() => setShowTransactions(!showTransactions)}
              className="w-full p-3 rounded-xl bg-bg-secondary border border-border-primary hover:border-accent-primary/50 transition-all flex items-center gap-3"
            >
              <History size={18} className="text-text-muted" />
              <span className="flex-1 text-left text-text-primary font-medium">История транзакций</span>
              <ChevronRight 
                size={18} 
                className={`text-text-muted transition-transform ${showTransactions ? 'rotate-90' : ''}`} 
              />
            </button>
            
            <AnimatePresence>
              {showTransactions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {subscription.transactions.length === 0 ? (
                      <div className="text-center py-6 text-text-muted text-sm">
                        Нет транзакций
                      </div>
                    ) : (
                      subscription.transactions.map((txn) => (
                        <div 
                          key={txn.id}
                          className="p-3 rounded-lg bg-bg-secondary border border-border-primary flex items-center gap-3"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            txn.type === 'spend' ? 'bg-red-500/20' : 'bg-green-500/20'
                          }`}>
                            {txn.type === 'spend' ? (
                              <TrendingUp size={14} className="text-red-400 rotate-180" />
                            ) : (
                              <Gift size={14} className="text-green-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-text-primary">{txn.description || txn.action}</div>
                            <div className="text-xs text-text-muted">
                              {new Date(txn.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                          <div className={`font-bold ${txn.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {txn.amount > 0 ? '+' : ''}{txn.amount}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Language Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Globe size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('settings.language')}</h2>
              <p className="text-sm text-text-muted">{t('settings.languageDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { code: 'ru', name: 'Русский', flag: '🇷🇺' },
              { code: 'en', name: 'English', flag: '🇺🇸' },
              { code: 'kz', name: 'Қазақша', flag: '🇰🇿' },
              { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
              { code: 'es', name: 'Español', flag: '🇪🇸' },
              { code: 'zh', name: '中文', flag: '🇨🇳' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as 'ru' | 'en' | 'kz' | 'de' | 'es' | 'zh')}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  language === lang.code
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-primary hover:border-accent-primary/50'
                }`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <div className="text-left">
                  <span className="font-medium text-text-primary block">{lang.name}</span>
                  {language === lang.code && (
                    <span className="text-xs text-accent-primary flex items-center gap-1">
                      <Check size={12} />
                      {t('common.selected')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Theme Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Palette size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('settings.theme')}</h2>
              <p className="text-sm text-text-muted">{t('settings.themeDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'dark', name: t('settings.darkTheme'), colors: ['#0A0A0F', '#8B5CF6'] },
              { id: 'light', name: t('settings.lightTheme'), colors: ['#FFFFFF', '#8B5CF6'] },
              { id: 'midnight', name: t('settings.midnightTheme'), colors: ['#0D1117', '#58A6FF'] },
            ].map((themeItem) => (
              <button
                key={themeItem.id}
                onClick={() => {
                  setTheme(themeItem.id);
                  document.documentElement.setAttribute('data-theme', themeItem.id);
                  localStorage.setItem('app_theme', themeItem.id);
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === themeItem.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-primary hover:border-accent-primary/50'
                }`}
              >
                <div className="flex gap-2 mb-3">
                  {themeItem.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-lg border border-border-secondary"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-text-primary">{themeItem.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Bell size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('settings.notifications')}</h2>
              <p className="text-sm text-text-muted">{t('settings.notificationsDesc')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary border border-border-primary">
            <div>
              <p className="text-text-primary font-medium">{notifications ? t('settings.enabled') : t('settings.disabled')}</p>
              <p className="text-sm text-text-muted">{t('settings.notificationsToggle')}</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-14 h-8 rounded-full transition-all ${
                notifications ? 'bg-accent-primary' : 'bg-bg-tertiary'
              }`}
            >
              <motion.div
                animate={{ x: notifications ? 24 : 4 }}
                className="w-6 h-6 bg-white rounded-full shadow-md"
              />
            </button>
          </div>
        </motion.div>

        {/* Referral Program Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
          className="card"
        >
          <ReferralProgram />
        </motion.div>

        {/* Data Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <Trash2 size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('settings.dangerZone')}</h2>
              <p className="text-sm text-text-muted">{t('settings.dangerZoneDesc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full p-4 rounded-xl bg-bg-secondary border border-border-primary hover:border-accent-primary/50 transition-all flex items-center gap-3"
            >
              <Download size={20} className="text-accent-primary" />
              <div className="text-left">
                <p className="text-text-primary font-medium">{t('settings.exportData')}</p>
                <p className="text-sm text-text-muted">{t('settings.exportDataDesc')}</p>
              </div>
            </button>
            
            <button
              onClick={handleClearData}
              className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-3"
            >
              <Trash2 size={20} className="text-red-400" />
              <div className="text-left">
                <p className="text-red-400 font-medium">{t('settings.clearData')}</p>
                <p className="text-sm text-red-400/70">{t('settings.clearDataWarning')}</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex justify-end"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
              saved
                ? 'bg-accent-success text-white'
                : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
            }`}
          >
            {saved ? (
              <>
                <Check size={20} />
                {t('settings.saved')}
              </>
            ) : (
              <>
                <Save size={20} />
                {t('common.save')}
              </>
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={clearDataModal}
        onClose={() => setClearDataModal(false)}
        onConfirm={confirmClearData}
        title={t('settings.confirmClearTitle')}
        message={t('settings.confirmClearMessage')}
        confirmText={t('settings.deleteAll')}
        cancelText={t('common.cancel')}
        type="danger"
      />

      <ConfirmModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, planId: null, plan: null })}
        onConfirm={() => {
          if (upgradeModal.planId) {
            subscription.setPlan(upgradeModal.planId);
            setSuccessModal({
              open: true,
              title: t('settings.planActivated'),
              message: t('settings.planActivatedMessage').replace('{plan}', upgradeModal.plan?.name || '')
            });
          }
        }}
        title={`${t('settings.upgradeTo')} ${upgradeModal.plan?.name}?`}
        message={
          <div className="space-y-2">
            <p>{t('settings.youWillGetAccess')}</p>
            <ul className="list-disc list-inside text-text-secondary space-y-1">
              <li>{t('settings.extendedLimits')}</li>
              <li>{t('settings.premiumTemplates')}</li>
              <li>{t('settings.priorityGeneration')}</li>
            </ul>
            <p className="text-lg font-bold text-purple-400 mt-3">
              ${upgradeModal.plan?.price}/{t('settings.perMonth')}
            </p>
          </div>
        }
        confirmText={t('settings.subscribeNow')}
        cancelText={t('common.cancel')}
        type="info"
      />

      {/* Payment Modal - новый модуль оплаты */}
      <PaymentModal
        isOpen={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, planId: 'starter' })}
        planId={paymentModal.planId}
        isRenewal={paymentModal.isRenewal}
        onSuccess={() => {
          setSuccessModal({
            open: true,
            title: paymentModal.isRenewal 
              ? t('settings.subscriptionRenewed')
              : t('settings.subscriptionActivated'),
            message: paymentModal.isRenewal
              ? t('settings.limitsReset')
              : t('settings.subscriptionSuccessMessage').replace('{plan}', SUBSCRIPTION_PLANS[paymentModal.planId].name)
          });
        }}
      />

      <AlertModal
        isOpen={successModal.open}
        onClose={() => setSuccessModal({ open: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        buttonText={t('settings.great')}
        type="success"
      />
    </div>
  );
};

export default SettingsPage;
