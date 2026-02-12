import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus,
  BarChart3,
  MessageSquare,
  Vote,
  Trash2,
  Check,
  Users,
  ArrowRight,
  Sparkles,
  Edit3,
  Copy
} from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  type: 'poll' | 'quiz' | 'qa' | 'wordcloud';
  question: string;
  options: PollOption[];
  correctAnswer?: string; // For quiz
  isActive: boolean;
  showResults: boolean;
  allowMultiple?: boolean;
}

interface PollsQuizzesProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertPoll: (poll: Poll) => void;
  slideIndex: number;
}

export default function PollsQuizzes({ isOpen, onClose, onInsertPoll, slideIndex }: PollsQuizzesProps) {
  const [activeTab, setActiveTab] = useState<'poll' | 'quiz' | 'qa' | 'wordcloud'>('poll');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '', votes: 0 },
    { id: '2', text: '', votes: 0 },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [allowMultiple, setAllowMultiple] = useState(false);
  
  // Saved polls
  const [savedPolls, setSavedPolls] = useState<Poll[]>(() => {
    try {
      const saved = localStorage.getItem('science-ai-polls');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { id: Date.now().toString(), text: '', votes: 0 }]);
    }
  };
  
  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(o => o.id !== id));
    }
  };
  
  const updateOption = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };
  
  const handleCreate = () => {
    if (!question.trim()) return;
    
    const poll: Poll = {
      id: `poll-${Date.now()}`,
      type: activeTab,
      question,
      options: options.filter(o => o.text.trim()),
      correctAnswer: activeTab === 'quiz' ? correctAnswer : undefined,
      isActive: false,
      showResults: false,
      allowMultiple,
    };
    
    // Save to localStorage
    const updated = [poll, ...savedPolls];
    setSavedPolls(updated);
    localStorage.setItem('science-ai-polls', JSON.stringify(updated));
    
    // Insert into slide
    onInsertPoll(poll);
    
    // Reset form
    setQuestion('');
    setOptions([
      { id: '1', text: '', votes: 0 },
      { id: '2', text: '', votes: 0 },
    ]);
    setCorrectAnswer('');
  };
  
  const deletePoll = (id: string) => {
    const updated = savedPolls.filter(p => p.id !== id);
    setSavedPolls(updated);
    localStorage.setItem('science-ai-polls', JSON.stringify(updated));
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
          className="w-full max-w-3xl max-h-[90vh] overflow-hidden glass rounded-3xl border border-border-primary shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-border-primary bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Vote className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Опросы и Квизы</h2>
                  <p className="text-sm text-text-muted">Интерактивный контент для аудитории</p>
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
                { id: 'poll', label: 'Опрос', icon: BarChart3, desc: 'Голосование' },
                { id: 'quiz', label: 'Квиз', icon: Check, desc: 'С правильным ответом' },
                { id: 'qa', label: 'Q&A', icon: MessageSquare, desc: 'Вопросы аудитории' },
                { id: 'wordcloud', label: 'Word Cloud', icon: Sparkles, desc: 'Облако слов' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'poll' | 'quiz' | 'qa' | 'wordcloud')}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-accent-primary text-white'
                      : 'text-text-secondary hover:bg-background-tertiary'
                  }`}
                >
                  <tab.icon size={18} className="mb-1" />
                  <div>{tab.label}</div>
                  <div className={`text-xs ${activeTab === tab.id ? 'text-white/70' : 'text-text-muted'}`}>
                    {tab.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
            {/* Create New */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {activeTab === 'quiz' ? 'Вопрос квиза' : activeTab === 'qa' ? 'Тема для вопросов' : activeTab === 'wordcloud' ? 'Вопрос для аудитории' : 'Вопрос опроса'}
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    activeTab === 'poll' ? 'Например: Какой язык программирования лучше?' :
                    activeTab === 'quiz' ? 'Например: Столица Франции?' :
                    activeTab === 'qa' ? 'Например: Задавайте вопросы по теме презентации' :
                    'Например: С чем у вас ассоциируется AI?'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all"
                />
              </div>
              
              {(activeTab === 'poll' || activeTab === 'quiz') && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-text-primary">
                        Варианты ответов
                      </label>
                      {options.length < 6 && (
                        <button
                          onClick={addOption}
                          className="text-sm text-accent-primary hover:text-accent-primary/80 flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Добавить
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {options.map((option, i) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-background-primary flex items-center justify-center text-sm font-medium text-text-muted">
                            {String.fromCharCode(65 + i)}
                          </div>
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(option.id, e.target.value)}
                            placeholder={`Вариант ${i + 1}`}
                            className="flex-1 px-4 py-2 rounded-xl bg-background-tertiary border border-border-primary text-text-primary placeholder-text-muted focus:border-accent-primary transition-all"
                          />
                          {activeTab === 'quiz' && (
                            <button
                              onClick={() => setCorrectAnswer(option.id)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                correctAnswer === option.id
                                  ? 'bg-green-500 text-white'
                                  : 'bg-background-primary text-text-muted hover:bg-green-500/20 hover:text-green-400'
                              }`}
                              title="Правильный ответ"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          {options.length > 2 && (
                            <button
                              onClick={() => removeOption(option.id)}
                              className="w-8 h-8 rounded-lg bg-background-primary text-text-muted hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {activeTab === 'poll' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowMultiple}
                        onChange={(e) => setAllowMultiple(e.target.checked)}
                        className="w-4 h-4 rounded accent-accent-primary"
                      />
                      <span className="text-sm text-text-secondary">Разрешить несколько ответов</span>
                    </label>
                  )}
                  
                  {activeTab === 'quiz' && !correctAnswer && (
                    <p className="text-sm text-amber-400 flex items-center gap-2">
                      ⚠️ Выберите правильный ответ, нажав на галочку
                    </p>
                  )}
                </>
              )}
              
              {activeTab === 'qa' && (
                <div className="p-4 rounded-xl bg-background-tertiary border border-border-primary">
                  <p className="text-sm text-text-muted">
                    Во время презентации аудитория сможет задавать вопросы в реальном времени. 
                    Вы увидите их на своём экране и сможете отвечать.
                  </p>
                </div>
              )}
              
              {activeTab === 'wordcloud' && (
                <div className="p-4 rounded-xl bg-background-tertiary border border-border-primary">
                  <p className="text-sm text-text-muted">
                    Аудитория отправляет слова, которые формируют облако. 
                    Чем чаще слово, тем оно крупнее.
                  </p>
                </div>
              )}
              
              <button
                onClick={handleCreate}
                disabled={!question.trim() || (activeTab === 'quiz' && !correctAnswer)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/30 transition-all"
              >
                <Plus size={18} />
                Добавить на слайд {slideIndex + 1}
              </button>
            </div>
            
            {/* Saved Polls */}
            {savedPolls.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-text-primary mb-3">Сохранённые ({savedPolls.length})</h3>
                <div className="space-y-2">
                  {savedPolls.map(poll => (
                    <div
                      key={poll.id}
                      className="p-3 rounded-xl bg-background-tertiary border border-border-primary flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          poll.type === 'poll' ? 'bg-blue-500/20 text-blue-400' :
                          poll.type === 'quiz' ? 'bg-green-500/20 text-green-400' :
                          poll.type === 'qa' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-pink-500/20 text-pink-400'
                        }`}>
                          {poll.type === 'poll' ? <BarChart3 size={18} /> :
                           poll.type === 'quiz' ? <Check size={18} /> :
                           poll.type === 'qa' ? <MessageSquare size={18} /> :
                           <Sparkles size={18} />}
                        </div>
                        <div>
                          <p className="text-sm text-text-primary">{poll.question}</p>
                          <p className="text-xs text-text-muted">
                            {poll.type === 'poll' ? 'Опрос' : poll.type === 'quiz' ? 'Квиз' : poll.type === 'qa' ? 'Q&A' : 'Word Cloud'} • 
                            {poll.options.length} вариантов
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onInsertPoll(poll)}
                          className="px-3 py-1.5 rounded-lg bg-accent-primary/20 text-accent-primary text-sm hover:bg-accent-primary/30 transition-colors"
                        >
                          Вставить
                        </button>
                        <button
                          onClick={() => deletePoll(poll.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-border-primary bg-background-secondary/50">
            <p className="text-sm text-text-muted text-center">
              🏆 Интерактивные опросы — уникальная функция Science AI, которой нет в Gamma!
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
