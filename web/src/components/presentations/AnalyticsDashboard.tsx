import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Eye, 
  Clock, 
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  MapPin,
  Monitor,
  Smartphone,
  Share2,
  Download,
  RefreshCw
} from 'lucide-react';

interface ViewData {
  id: string;
  timestamp: string;
  duration: number; // seconds
  device: 'desktop' | 'mobile' | 'tablet';
  location?: string;
  slidesViewed: number[];
  completionRate: number;
  source?: string;
}

interface PresentationAnalytics {
  presentationId: string;
  title: string;
  totalViews: number;
  uniqueViewers: number;
  avgDuration: number;
  completionRate: number;
  views: ViewData[];
  slideEngagement: { slideIndex: number; views: number; avgTime: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  topLocations: { name: string; count: number }[];
  viewsByDate: { date: string; count: number }[];
}

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  presentationId: string;
  presentationTitle: string;
  totalSlides?: number;
}

// Storage key for analytics
const ANALYTICS_STORAGE_KEY = 'science-ai-presentation-analytics';

// Get analytics from localStorage
const getStoredAnalytics = (presentationId: string): ViewData[] => {
  try {
    const data = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!data) return [];
    const all = JSON.parse(data);
    return all[presentationId] || [];
  } catch {
    return [];
  }
};

// Track a view (call this when presentation is viewed)
export const trackPresentationView = (
  presentationId: string,
  slidesViewed: number[],
  duration: number,
  totalSlides: number
) => {
  try {
    const device = /Mobile|Android|iPhone/i.test(navigator.userAgent) 
      ? 'mobile' 
      : /Tablet|iPad/i.test(navigator.userAgent) 
      ? 'tablet' 
      : 'desktop';
    
    const view: ViewData = {
      id: `view-${Date.now()}`,
      timestamp: new Date().toISOString(),
      duration,
      device,
      location: Intl.DateTimeFormat().resolvedOptions().timeZone,
      slidesViewed,
      completionRate: totalSlides > 0 ? (slidesViewed.length / totalSlides) * 100 : 0,
      source: document.referrer ? new URL(document.referrer).hostname : 'direct'
    };
    
    const data = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    const all = data ? JSON.parse(data) : {};
    
    if (!all[presentationId]) {
      all[presentationId] = [];
    }
    all[presentationId].push(view);
    
    // Keep only last 500 views per presentation
    if (all[presentationId].length > 500) {
      all[presentationId] = all[presentationId].slice(-500);
    }
    
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to track view:', e);
  }
};

// Calculate analytics from stored views
const calculateAnalytics = (presentationId: string, title: string, totalSlides: number): PresentationAnalytics => {
  const views = getStoredAnalytics(presentationId);
  const now = new Date();
  
  // Calculate unique viewers (by day + device as proxy)
  const uniqueSet = new Set(views.map(v => {
    const date = new Date(v.timestamp).toDateString();
    return `${date}-${v.device}`;
  }));
  
  // Average duration
  const avgDuration = views.length > 0
    ? Math.round(views.reduce((sum, v) => sum + v.duration, 0) / views.length)
    : 0;
  
  // Completion rate
  const avgCompletion = views.length > 0
    ? Math.round(views.reduce((sum, v) => sum + v.completionRate, 0) / views.length)
    : 0;
  
  // Device breakdown
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  views.forEach(v => deviceCounts[v.device]++);
  const total = views.length || 1;
  const deviceBreakdown = {
    desktop: Math.round((deviceCounts.desktop / total) * 100),
    mobile: Math.round((deviceCounts.mobile / total) * 100),
    tablet: Math.round((deviceCounts.tablet / total) * 100)
  };
  
  // Views by date (last 14 days)
  const viewsByDate: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toDateString();
    const count = views.filter(v => new Date(v.timestamp).toDateString() === dateStr).length;
    viewsByDate.push({
      date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      count
    });
  }
  
  // Top locations
  const locationCounts: Record<string, number> = {};
  views.forEach(v => {
    const loc = v.location || 'Неизвестно';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  const topLocations = Object.entries(locationCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Slide engagement
  const slideStats: Record<number, { views: number; totalTime: number }> = {};
  views.forEach(v => {
    const timePerSlide = v.slidesViewed.length > 0 ? v.duration / v.slidesViewed.length : 0;
    v.slidesViewed.forEach(slideIdx => {
      if (!slideStats[slideIdx]) {
        slideStats[slideIdx] = { views: 0, totalTime: 0 };
      }
      slideStats[slideIdx].views++;
      slideStats[slideIdx].totalTime += timePerSlide;
    });
  });
  
  const slideEngagement = Array.from({ length: totalSlides }, (_, i) => ({
    slideIndex: i,
    views: slideStats[i]?.views || 0,
    avgTime: slideStats[i]?.views > 0 
      ? Math.round(slideStats[i].totalTime / slideStats[i].views) 
      : 0
  }));
  
  return {
    presentationId,
    title,
    totalViews: views.length,
    uniqueViewers: uniqueSet.size,
    avgDuration,
    completionRate: avgCompletion,
    views: views.slice().reverse().slice(0, 50), // Most recent first
    slideEngagement,
    deviceBreakdown,
    topLocations,
    viewsByDate
  };
};

export default function AnalyticsDashboard({ isOpen, onClose, presentationId, presentationTitle, totalSlides = 10 }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<PresentationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'slides' | 'audience'>('overview');
  
  const loadAnalytics = () => {
    setIsLoading(true);
    // Small delay for UI feedback
    setTimeout(() => {
      setAnalytics(calculateAnalytics(presentationId, presentationTitle, totalSlides));
      setIsLoading(false);
    }, 300);
  };
  
  useEffect(() => {
    if (isOpen && presentationId) {
      loadAnalytics();
    }
  }, [isOpen, presentationId, presentationTitle, totalSlides]);
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl max-h-[90vh] overflow-hidden glass rounded-3xl border border-border-primary shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-border-primary bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Аналитика</h2>
                  <p className="text-sm text-text-muted">{presentationTitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-background-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              {[
                { id: 'overview', label: 'Обзор', icon: TrendingUp },
                { id: 'slides', label: 'Слайды', icon: Monitor },
                { id: 'audience', label: 'Аудитория', icon: Users },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'slides' | 'audience')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-accent-primary text-white'
                      : 'text-text-secondary hover:bg-background-tertiary'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
              </div>
            ) : analytics && (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Всего просмотров', value: analytics.totalViews, icon: Eye, color: 'from-blue-500 to-cyan-500' },
                        { label: 'Уникальных', value: analytics.uniqueViewers, icon: Users, color: 'from-purple-500 to-pink-500' },
                        { label: 'Среднее время', value: formatDuration(analytics.avgDuration), icon: Clock, color: 'from-orange-500 to-amber-500' },
                        { label: 'Досмотрели до конца', value: `${analytics.completionRate}%`, icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
                      ].map((metric, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-4 rounded-2xl bg-background-tertiary border border-border-primary"
                        >
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center mb-3`}>
                            <metric.icon className="text-white" size={20} />
                          </div>
                          <p className="text-2xl font-bold text-text-primary">{metric.value}</p>
                          <p className="text-sm text-text-muted">{metric.label}</p>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Views Chart */}
                    <div className="p-4 rounded-2xl bg-background-tertiary border border-border-primary">
                      <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-accent-primary" />
                        Просмотры за 14 дней
                      </h3>
                      <div className="flex items-end gap-2 h-32">
                        {analytics.viewsByDate.map((day, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(day.count / 10) * 100}%` }}
                              transition={{ delay: i * 0.05, duration: 0.5 }}
                              className="w-full bg-gradient-to-t from-accent-primary to-accent-secondary rounded-t-lg min-h-[4px]"
                            />
                            <span className="text-[10px] text-text-muted">{day.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Device Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-background-tertiary border border-border-primary">
                        <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
                          <Monitor size={18} className="text-blue-400" />
                          Устройства
                        </h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Desktop', value: analytics.deviceBreakdown.desktop, icon: Monitor, color: 'bg-blue-500' },
                            { label: 'Mobile', value: analytics.deviceBreakdown.mobile, icon: Smartphone, color: 'bg-purple-500' },
                            { label: 'Tablet', value: analytics.deviceBreakdown.tablet, icon: Monitor, color: 'bg-orange-500' },
                          ].map((device, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <device.icon size={16} className="text-text-muted" />
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-text-secondary">{device.label}</span>
                                  <span className="text-text-primary font-medium">{device.value}%</span>
                                </div>
                                <div className="h-2 bg-background-primary rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${device.value}%` }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    className={`h-full ${device.color} rounded-full`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Top Locations */}
                      <div className="p-4 rounded-2xl bg-background-tertiary border border-border-primary">
                        <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
                          <MapPin size={18} className="text-green-400" />
                          География
                        </h3>
                        <div className="space-y-2">
                          {analytics.topLocations.map((loc, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-border-primary last:border-0">
                              <span className="text-text-secondary">{loc.name}</span>
                              <span className="text-text-primary font-medium">{loc.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'slides' && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-text-primary mb-4">Вовлечённость по слайдам</h3>
                    {analytics.slideEngagement.map((slide, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-3 rounded-xl bg-background-tertiary border border-border-primary"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-2">
                            <span className="text-text-secondary">Слайд {i + 1}</span>
                            <div className="flex gap-4 text-sm">
                              <span className="text-text-muted">
                                <Eye size={12} className="inline mr-1" />
                                {slide.views} просмотров
                              </span>
                              <span className="text-text-muted">
                                <Clock size={12} className="inline mr-1" />
                                {slide.avgTime}с среднее
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-background-primary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(slide.views / 50) * 100}%` }}
                              transition={{ delay: i * 0.05, duration: 0.5 }}
                              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {activeTab === 'audience' && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-text-primary mb-4">Последние просмотры</h3>
                    <div className="space-y-2">
                      {analytics.views.slice(0, 20).map((view, i) => (
                        <motion.div
                          key={view.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary border border-border-primary"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
                              {view.device === 'mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}
                            </div>
                            <div>
                              <p className="text-sm text-text-primary">
                                {view.location || 'Неизвестно'}
                              </p>
                              <p className="text-xs text-text-muted">
                                {new Date(view.timestamp).toLocaleString('ru-RU')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-text-primary">
                              {formatDuration(view.duration)}
                            </p>
                            <p className="text-xs text-text-muted">
                              {Math.round(view.completionRate)}% просмотрено
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-border-primary bg-background-secondary/50 flex justify-between items-center">
            <p className="text-sm text-text-muted">
              🏆 Аналитика — эксклюзивная функция Science AI
            </p>
            <div className="flex gap-2">
              <button 
                onClick={loadAnalytics}
                className="px-4 py-2 rounded-lg bg-background-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 text-sm"
              >
                <RefreshCw size={14} />
                Обновить
              </button>
              <button 
                onClick={() => {
                  if (analytics) {
                    const csv = [
                      'Дата,Просмотры',
                      ...analytics.viewsByDate.map(d => `${d.date},${d.count}`)
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `analytics-${presentationId}.csv`;
                    a.click();
                  }
                }}
                className="px-4 py-2 rounded-lg bg-background-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 text-sm"
              >
                <Download size={14} />
                Экспорт CSV
              </button>
              <button 
                onClick={() => {
                  if (analytics) {
                    const text = `Аналитика: ${analytics.title}\nПросмотров: ${analytics.totalViews}\nУникальных: ${analytics.uniqueViewers}\nСреднее время: ${formatDuration(analytics.avgDuration)}`;
                    navigator.share?.({ title: 'Аналитика презентации', text });
                  }
                }}
                className="px-4 py-2 rounded-lg bg-background-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 text-sm"
              >
                <Share2 size={14} />
                Поделиться
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
