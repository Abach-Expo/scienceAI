import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavigateFunction } from 'react-router-dom';
import {
  Sparkles,
  Layers,
  Plus,
  Settings,
  LogOut,
  User,
  ChevronRight,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Folder,
  Menu,
  X,
} from 'lucide-react';
import { UsageBanner } from '../UsageBanner';

interface UserData {
  name: string;
  email: string;
  isLoggedIn: boolean;
  createdAt?: string;
}

interface DashboardSidebarProps {
  user: UserData;
  activeTab: 'all' | 'presentations' | 'dissertations';
  setActiveTab: (tab: 'all' | 'presentations' | 'dissertations') => void;
  onNewProject: () => void;
  onShowProfile: () => void;
  onLogout: () => void;
  navigate: NavigateFunction;
  t: (key: string) => string;
  language: string;
}

const DashboardSidebar = ({
  user,
  activeTab,
  setActiveTab,
  onNewProject,
  onShowProfile,
  onLogout,
  navigate,
  t,
  language,
}: DashboardSidebarProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNavClick = (callback: () => void) => {
    callback();
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="text-white" size={22} />
            </div>
            <span className="text-xl font-bold text-text-primary">Science AI</span>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* New Project Button */}
      <div className="p-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavClick(onNewProject)}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium flex items-center gap-3"
        >
          <Plus size={20} />
          {t('common.new')} {t('nav.allProjects').split(' ').pop()}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3 px-3">
          {t('nav.dashboard')}
        </p>
        
        {[
          { id: 'all' as const, icon: Folder, label: t('nav.allProjects') },
          { id: 'presentations' as const, icon: Layers, label: t('nav.presentations') },
          { id: 'dissertations' as const, icon: BookOpen, label: t('nav.dissertations') },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(() => setActiveTab(item.id))}
            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${
              activeTab === item.id
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}

        <div className="h-px bg-border-primary my-3" />
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3 px-3">
          {t('nav.quickActions')}
        </p>

        <button
          onClick={() => handleNavClick(() => navigate('/chat'))}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
        >
          <MessageSquare size={18} />
          {t('nav.chat')}
        </button>
        <button
          onClick={() => handleNavClick(() => navigate('/academic'))}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
        >
          <GraduationCap size={18} />
          {t('nav.dissertations')}
        </button>
      </nav>

      {/* Usage Banner */}
      <div className="px-4 pb-2">
        <UsageBanner compact />
      </div>

      {/* User */}
      <div className="p-4 border-t border-border-primary relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-medium text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
          <ChevronRight size={16} className={`transition-transform flex-shrink-0 ${showUserMenu ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-4 right-4 mb-2 py-2 rounded-xl glass border border-border-primary shadow-xl z-50"
            >
              <button 
                onClick={() => { handleNavClick(onShowProfile); setShowUserMenu(false); }}
                className="w-full px-4 py-2 flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary transition-all"
              >
                <User size={16} />
                {t('common.profile')}
              </button>
              <button 
                onClick={() => handleNavClick(() => navigate('/settings'))}
                className="w-full px-4 py-2 flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary transition-all"
              >
                <Settings size={16} />
                {t('common.settings')}
              </button>
              <div className="h-px bg-border-primary my-1" />
              <button 
                onClick={onLogout}
                className="w-full px-4 py-2 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={16} />
                {t('common.logout')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl bg-bg-secondary border border-border-primary shadow-lg text-text-primary hover:bg-bg-tertiary transition-all"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Desktop sidebar - always visible on md+ */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex w-72 bg-bg-secondary border-r border-border-primary flex-col flex-shrink-0"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar - overlay drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-bg-secondary flex flex-col shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardSidebar;
