import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../store/authStore';
import {
  MessageSquare,
  Layers,
  FileText,
  Search,
  Clock,
  Star,
  Filter,
  BarChart3,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useTranslation } from '../store/languageStore';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '../components/KeyboardShortcuts';
import {
  DashboardSidebar,
  StatsWidgets,
  ProfileModal,
  NewProjectModal,
  ItemCard,
} from '../components/dashboard';

interface ChatItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  type: 'chat' | 'presentation' | 'dissertation';
  starred?: boolean;
}

interface UserData {
  name: string;
  email: string;
  isLoggedIn: boolean;
  createdAt?: string;
}

const DashboardPage = () => {
  useDocumentTitle('Панель управления');
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'presentations' | 'dissertations'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWidgets, setShowWidgets] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  useKeyboardShortcuts();
  
  const [stats, setStats] = useState({
    totalProjects: 0,
    thisWeek: 0,
    wordsWritten: 0,
    aiRequests: 0,
    streak: 0,
  });
  
  const [tipIndex, setTipIndex] = useState(0);
  const tips = [
    t('dashboard.tips.tip1'),
    t('dashboard.tips.tip2'),
    t('dashboard.tips.tip3'),
    t('dashboard.tips.tip4'),
    t('dashboard.tips.tip5'),
  ];

  useEffect(() => {
    const authUser = useAuthStore.getState().user;
    if (!authUser) {
      navigate('/auth');
      return;
    }
    setUser({
      name: authUser.name || '',
      email: authUser.email || '',
      isLoggedIn: true,
    });
    
    localStorage.removeItem('dashboard_items');

    const loadItems = () => {
      const allItems: ChatItem[] = [];
      
      const savedChats = localStorage.getItem('chats');
      if (savedChats) {
        try {
          const chats = JSON.parse(savedChats);
          chats.forEach((chat: { id: string; title?: string; messages?: { content: string }[]; updatedAt?: string; createdAt?: string; starred?: boolean }) => {
            const lastMsg = chat.messages?.length ? chat.messages[chat.messages.length - 1] : null;
            allItems.push({
              id: chat.id,
              title: chat.title || 'Новый чат',
              lastMessage: lastMsg
                ? lastMsg.content.slice(0, 50) + '...'
                : 'Начните общение...',
              timestamp: new Date(chat.updatedAt || chat.createdAt || Date.now()),
              type: 'chat',
              starred: chat.starred || false,
            });
          });
        } catch (e) { /* ignore */ }
      }
      
      const savedPresentations = localStorage.getItem('science-ai-presentations');
      if (savedPresentations) {
        try {
          const presentations = JSON.parse(savedPresentations);
          presentations.forEach((pres: { id: string; title?: string; slides?: unknown[]; updatedAt?: string; createdAt?: string; starred?: boolean }) => {
            allItems.push({
              id: pres.id,
              title: pres.title || 'Презентация',
              lastMessage: `${pres.slides?.length || 0} слайдов`,
              timestamp: new Date(pres.updatedAt || pres.createdAt || Date.now()),
              type: 'presentation',
              starred: pres.starred || false,
            });
          });
        } catch (e) { /* ignore */ }
      }
      
      const savedDissertations = localStorage.getItem('dissertations');
      if (savedDissertations) {
        try {
          const dissertations = JSON.parse(savedDissertations);
          dissertations.forEach((diss: { id: string; title?: string; wordCount?: number; updatedAt?: string; createdAt?: string; starred?: boolean }) => {
            allItems.push({
              id: diss.id,
              title: diss.title || 'Диссертация',
              lastMessage: `${diss.wordCount || 0} слов`,
              timestamp: new Date(diss.updatedAt || diss.createdAt || Date.now()),
              type: 'dissertation',
              starred: diss.starred || false,
            });
          });
        } catch (e) { /* ignore */ }
      }
      
      allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setItems(allItems);
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisWeekItems = allItems.filter(item => item.timestamp >= weekAgo);
      
      let totalWords = 0;
      if (savedDissertations) {
        try {
          const dissertations = JSON.parse(savedDissertations);
          dissertations.forEach((d: { wordCount?: number }) => {
            totalWords += d.wordCount || 0;
          });
        } catch (e) { /* ignore */ }
      }
      
      const aiRequests = parseInt(localStorage.getItem('ai_requests_count') || '0');
      
      const lastActiveDate = localStorage.getItem('last_active_date');
      const today = new Date().toDateString();
      let streak = parseInt(localStorage.getItem('activity_streak') || '0');
      
      if (lastActiveDate !== today) {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
        if (lastActiveDate === yesterday) {
          streak += 1;
        } else if (lastActiveDate !== today) {
          streak = 1;
        }
        localStorage.setItem('last_active_date', today);
        localStorage.setItem('activity_streak', streak.toString());
      }
      
      setStats({
        totalProjects: allItems.length,
        thisWeek: thisWeekItems.length,
        wordsWritten: totalWords,
        aiRequests,
        streak,
      });
      
      setTipIndex(Math.floor(Math.random() * 5));
    };
    
    loadItems();
  }, [navigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    navigate('/');
  }, [navigate]);

  const handleNewItem = useCallback((type: 'chat' | 'presentation' | 'dissertation') => {
    if (type === 'presentation') {
      navigate('/presentations');
    } else {
      const newId = `${type}-${Date.now()}`;
      if (type === 'chat') {
        navigate(`/chat/${newId}`);
      } else {
        navigate(`/dissertation/${newId}`);
      }
    }
  }, [navigate]);

  const handleDeleteItem = useCallback((id: string, type: string) => {
    try {
      if (type === 'chat') {
        const saved = localStorage.getItem('chats');
        if (saved) {
          const list = JSON.parse(saved).filter((item: { id: string }) => item.id !== id);
          localStorage.setItem('chats', JSON.stringify(list));
        }
      } else if (type === 'presentation') {
        const saved = localStorage.getItem('science-ai-presentations');
        if (saved) {
          const list = JSON.parse(saved).filter((item: { id: string }) => item.id !== id);
          localStorage.setItem('science-ai-presentations', JSON.stringify(list));
        }
      } else if (type === 'dissertation') {
        const saved = localStorage.getItem('dissertations');
        if (saved) {
          const list = JSON.parse(saved).filter((item: { id: string }) => item.id !== id);
          localStorage.setItem('dissertations', JSON.stringify(list));
        }
      }
    } catch (e) { /* ignore */ }
    
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleToggleStar = useCallback((id: string, type: string) => {
    try {
      const storageKey = type === 'chat' ? 'chats' : type === 'presentation' ? 'science-ai-presentations' : 'dissertations';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const list = JSON.parse(saved).map((item: { id: string; starred?: boolean }) => 
          item.id === id ? { ...item, starred: !item.starred } : item
        );
        localStorage.setItem(storageKey, JSON.stringify(list));
      }
    } catch (e) { /* ignore */ }
    
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, starred: !item.starred } : item
    ));
  }, []);

  const filteredItems = useMemo(() => items.filter(item => {
    if (item.type === 'chat') return false;
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'presentations' && item.type === 'presentation') ||
      (activeTab === 'dissertations' && item.type === 'dissertation');
    
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStarred = !showStarredOnly || item.starred;
    
    return matchesTab && matchesSearch && matchesStarred;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    if (sortBy === 'type') return a.type.localeCompare(b.type);
    return b.timestamp.getTime() - a.timestamp.getTime();
  }), [items, activeTab, searchQuery, showStarredOnly, sortBy]);

  const formatTime = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return t('time.justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('time.minutesAgo')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('time.hoursAgo')}`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} ${t('time.daysAgo')}`;
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US');
  }, [t, language]);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'chat': return <MessageSquare size={18} className="text-blue-400" />;
      case 'presentation': return <Layers size={18} className="text-purple-400" />;
      case 'dissertation': return <FileText size={18} className="text-emerald-400" />;
      default: return <FileText size={18} />;
    }
  }, []);

  const getTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'chat': return t('types.chat');
      case 'presentation': return t('types.presentation');
      case 'dissertation': return t('types.dissertation');
      default: return '';
    }
  }, [t]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <DashboardSidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewProject={() => setShowNewProjectModal(true)}
        onShowProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
        navigate={navigate}
        t={t}
        language={language}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-6 border-b border-border-primary bg-bg-secondary/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {activeTab === 'all' && t('nav.allProjects')}
                {activeTab === 'presentations' && t('nav.presentations')}
                {activeTab === 'dissertations' && t('nav.dissertations')}
              </h1>
              <p className="text-text-muted">
                {filteredItems.length} {filteredItems.length === 1 ? t('dashboard.item') : t('dashboard.items')}
              </p>
            </div>
            
            <button
              onClick={() => setShowWidgets(!showWidgets)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all ${
                showWidgets 
                  ? 'bg-accent-primary/20 text-accent-primary' 
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              <BarChart3 size={16} />
              {language === 'ru' ? 'Виджеты' : 'Widgets'}
            </button>
          </div>
          
          <StatsWidgets
            showWidgets={showWidgets}
            stats={stats}
            tipText={tips[tipIndex]}
            t={t}
          />

          {/* Search & Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 rounded-xl glass border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-all"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-xl glass border transition-all flex items-center gap-2 ${
                  showFilters || showStarredOnly || sortBy !== 'date'
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-border-primary text-text-secondary hover:text-text-primary hover:border-accent-primary/50'
                }`}
              >
                <Filter size={18} />
                {t('common.filter')}
                {(showStarredOnly || sortBy !== 'date') && (
                  <span className="w-2 h-2 rounded-full bg-accent-primary" />
                )}
              </button>
              
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-64 p-4 rounded-xl glass border border-border-primary shadow-xl z-20"
                  >
                    <h4 className="text-sm font-medium text-text-primary mb-3">{t('common.sort')}</h4>
                    <div className="space-y-2 mb-4">
                      {[
                        { id: 'date', label: t('dashboard.sortByDate') },
                        { id: 'name', label: t('dashboard.sortByName') },
                        { id: 'type', label: t('dashboard.sortByType') },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSortBy(option.id as 'date' | 'name' | 'type')}
                          className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-all ${
                            sortBy === option.id
                              ? 'bg-accent-primary/20 text-accent-primary'
                              : 'text-text-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    
                    <div className="h-px bg-border-primary my-3" />
                    
                    <button
                      onClick={() => setShowStarredOnly(!showStarredOnly)}
                      className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition-all ${
                        showStarredOnly
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'text-text-secondary hover:bg-bg-tertiary'
                      }`}
                    >
                      <Star size={14} className={showStarredOnly ? 'fill-amber-400' : ''} />
                      {t('dashboard.starredOnly')}
                    </button>
                    
                    {(showStarredOnly || sortBy !== 'date') && (
                      <button
                        onClick={() => { setSortBy('date'); setShowStarredOnly(false); }}
                        className="w-full mt-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        {t('dashboard.resetFilters')}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {filteredItems.length === 0 ? (
            <EmptyState 
              type={searchQuery ? 'search' : activeTab}
              searchQuery={searchQuery}
              onAction={() => {
                if (searchQuery) {
                  setSearchQuery('');
                } else if (activeTab === 'presentations') {
                  handleNewItem('presentation');
                } else if (activeTab === 'dissertations') {
                  handleNewItem('dissertation');
                } else {
                  handleNewItem('chat');
                }
              }}
            />
          ) : (
            <div className="grid gap-4">
              {filteredItems.some(item => item.starred) && (
                <>
                  <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
                    <Star size={14} className="text-amber-400" />
                    {t('dashboard.starred')}
                  </h3>
                  {filteredItems.filter(item => item.starred).map((item) => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      onDelete={handleDeleteItem}
                      onToggleStar={handleToggleStar}
                      formatTime={formatTime}
                      getTypeIcon={getTypeIcon}
                      getTypeLabel={getTypeLabel}
                      navigate={navigate}
                      t={t}
                    />
                  ))}
                  <div className="h-px bg-border-primary my-2" />
                </>
              )}

              <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
                <Clock size={14} />
                {t('dashboard.recent')}
              </h3>
              {filteredItems.filter(item => !item.starred).map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onDelete={handleDeleteItem}
                  onToggleStar={handleToggleStar}
                  formatTime={formatTime}
                  getTypeIcon={getTypeIcon}
                  getTypeLabel={getTypeLabel}
                  navigate={navigate}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        itemsCount={items.length}
        starredCount={items.filter(i => i.starred).length}
        navigate={navigate}
        t={t}
        language={language}
      />

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        navigate={navigate}
        language={language}
      />

      <KeyboardShortcutsHelp isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
    </div>
  );
};

export default DashboardPage;
