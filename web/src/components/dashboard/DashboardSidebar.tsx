import { useState } from 'react';
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

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-72 bg-bg-secondary border-r border-border-primary flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 border-b border-border-primary">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Sparkles className="text-white" size={22} />
          </div>
          <span className="text-xl font-bold text-text-primary">Science AI</span>
        </div>
      </div>

      {/* New Project Button */}
      <div className="p-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewProject}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium flex items-center gap-3"
        >
          <Plus size={20} />
          {language === 'ru' ? 'Новый проект' : 'New Project'}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3 px-3">
          {language === 'ru' ? 'Меню' : 'Menu'}
        </p>
        
        {[
          { id: 'all' as const, icon: Folder, label: t('nav.allProjects') },
          { id: 'presentations' as const, icon: Layers, label: t('nav.presentations') },
          { id: 'dissertations' as const, icon: BookOpen, label: t('nav.dissertations') },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
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
          {language === 'ru' ? 'Инструменты' : 'Tools'}
        </p>

        <button
          onClick={() => navigate('/chat')}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
        >
          <MessageSquare size={18} />
          {language === 'ru' ? 'AI Чат' : 'AI Chat'}
        </button>
        <button
          onClick={() => navigate('/academic')}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
        >
          <GraduationCap size={18} />
          {language === 'ru' ? 'Академические работы' : 'Academic Works'}
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
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
          <ChevronRight size={16} className={`transition-transform ${showUserMenu ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-4 right-4 mb-2 py-2 rounded-xl glass border border-border-primary shadow-xl"
            >
              <button 
                onClick={() => { onShowProfile(); setShowUserMenu(false); }}
                className="w-full px-4 py-2 flex items-center gap-3 text-text-secondary hover:bg-bg-tertiary transition-all"
              >
                <User size={16} />
                {t('common.profile')}
              </button>
              <button 
                onClick={() => navigate('/settings')}
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
    </motion.aside>
  );
};

export default DashboardSidebar;
