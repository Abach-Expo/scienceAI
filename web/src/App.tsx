import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { getTranslation, Language } from './i18n/translations';

// Retry wrapper for lazy imports — handles network errors gracefully
const lazyRetry = (importFn: () => Promise<{ default: React.ComponentType }>, retries = 3): Promise<{ default: React.ComponentType }> => {
  return new Promise((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error: unknown) => {
        if (retries > 0) {
          setTimeout(() => {
            lazyRetry(importFn, retries - 1).then(resolve, reject);
          }, 1000);
        } else {
          // After retries exhausted, reload the page (clears stale module cache)
          if (!window.location.hash.includes('retry')) {
            window.location.hash = 'retry';
            window.location.reload();
          } else {
            reject(error);
          }
        }
      });
  });
};

// Lazy-loaded pages with retry
const HomePage = lazy(() => lazyRetry(() => import('./pages/HomePage')));
const PresentationsPage = lazy(() => lazyRetry(() => import('./pages/PresentationsPage')));
const AuthPage = lazy(() => lazyRetry(() => import('./pages/AuthPage')));
const ScienceAIChat = lazy(() => lazyRetry(() => import('./pages/ScienceAIChat')));
const ChatPage = lazy(() => lazyRetry(() => import('./pages/ChatPage')));
const DissertationPage = lazy(() => lazyRetry(() => import('./pages/DissertationPage')));
const AcademicWorksPage = lazy(() => lazyRetry(() => import('./pages/AcademicWorksPage')));
const SettingsPage = lazy(() => lazyRetry(() => import('./pages/SettingsPage')));
const ProfileSetupPage = lazy(() => lazyRetry(() => import('./pages/ProfileSetupPage')));
const PricingPage = lazy(() => lazyRetry(() => import('./pages/PricingPage')));
const PrivacyPage = lazy(() => lazyRetry(() => import('./pages/PrivacyPage')));
const TermsPage = lazy(() => lazyRetry(() => import('./pages/TermsPage')));
const NewProjectPage = lazy(() => lazyRetry(() => import('./pages/NewProjectPage')));
const WorkspaceSetupPage = lazy(() => lazyRetry(() => import('./pages/WorkspaceSetupPage')));
const NotFoundPage = lazy(() => lazyRetry(() => import('./pages/NotFoundPage')));

import { NotificationProvider } from './components/NotificationSystem';
import { OnboardingTour, useOnboarding } from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import { initStorageManager } from './utils/storageManager';

// Offline/Online Banner
const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnline, setShowOnline] = useState(false);
  const lang = (localStorage.getItem('app_language') || 'ru') as Language;

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      setShowOnline(true);
      setTimeout(() => setShowOnline(false), 3000);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-500/95 text-white text-center py-2 text-sm font-medium backdrop-blur-sm"
        >
          {getTranslation(lang, 'common.offline')}
        </motion.div>
      )}
      {showOnline && !isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-green-500/95 text-white text-center py-2 text-sm font-medium backdrop-blur-sm"
        >
          {getTranslation(lang, 'common.online')}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Loading fallback for lazy-loaded pages
const PageLoader = () => {
  const lang = (localStorage.getItem('app_language') || 'ru') as Language;
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        <p className="text-text-muted text-sm">{getTranslation(lang, 'common.loading')}</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user?.isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children || <Outlet />}</>;
};

// Inner App with Onboarding
const AppContent = () => {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isAuthenticated, logout } = useAuthStore();

  // Session inactivity timeout — 30 min
  useEffect(() => {
    if (!isAuthenticated) return;
    const INACTIVITY_MS = 30 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { logout(); }, INACTIVITY_MS);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated, logout]);
  
  return (
    <>
      {/* Skip to main content link for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-primary focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <main id="main-content" role="main">
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<ScienceAIChat />} />
                <Route path="/new-project" element={<NewProjectPage />} />
                <Route path="/presentations" element={<PresentationsPage />} />
                <Route path="/presentations/:id" element={<PresentationsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />
                <Route path="/dissertation" element={<DissertationPage />} />
                <Route path="/dissertation/:id" element={<DissertationPage />} />
                <Route path="/academic" element={<AcademicWorksPage />} />
                <Route path="/academic/:type" element={<AcademicWorksPage />} />
                <Route path="/academic/:type/:id" element={<AcademicWorksPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile-setup" element={<ProfileSetupPage />} />
                <Route path="/workspace-setup" element={<WorkspaceSetupPage />} />
              </Route>
              
              {/* Public routes */}
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              {/* 404 - catch all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      
      {/* Announcements for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="aria-announcements" />
      
      {/* Onboarding Tour */}
      <OnboardingTour isOpen={showOnboarding} onComplete={completeOnboarding} />
    </>
  );
};

function App() {
  // Apply saved theme on mount — respect system preference if no saved choice
  useEffect(() => {
    initStorageManager();
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
    // Sync <html lang> with saved language so browser auto-translate respects it
    const lang = (localStorage.getItem('app_language') || 'ru') as Language;
    document.documentElement.lang = lang === 'kz' ? 'kk' : lang;
  }, []);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <NotificationProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
