/**
 * 🔍 PLAGIARISM CHECKER v2.0
 * Реальная проверка плагиата через CrossRef, Semantic Scholar + Google
 * + AI-детекция паттернов + статистический анализ
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSearch,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Target,
  BarChart3,
  Lightbulb,
  Download,
  ExternalLink,
  BookOpen,
  Globe,
  Activity,
  Layers,
  Eye,
} from 'lucide-react';

import { API_URL } from '../config';
import { getAuthorizationHeaders } from '../services/apiClient';
// (moved from inline definition)

// ================== ТИПЫ ==================

interface PlagiarismSource {
  url: string;
  title: string;
  snippet: string;
  similarity: number;
  type: 'web' | 'academic' | 'journal' | 'book';
}

interface PlagiarismIssue {
  type: 'ai_pattern' | 'plagiarism' | 'cliche' | 'self_plagiarism';
  text: string;
  suggestion: string;
  severity?: 'low' | 'medium' | 'high';
  source?: PlagiarismSource;
}

interface PlagiarismResult {
  uniquenessScore: number;
  aiProbability: number;
  sourcesFound: number;
  sources: PlagiarismSource[];
  analysis: {
    issues: PlagiarismIssue[];
    strengths: string[];
    summary: string;
  };
  recommendations: string[];
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  metrics: {
    exactMatchPercent: number;
    paraphraseMatchPercent: number;
    citationCoverage: number;
    vocabularyRichness: number;
    burstiness: number;
    perplexity: number;
  };
}

// ================== API ==================

export async function checkPlagiarism(text: string, language: 'ru' | 'en' = 'ru'): Promise<PlagiarismResult> {
  const response = await fetch(`${API_URL}/ai/check-plagiarism`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Ошибка проверки');
  return data;
}

// ================== КОМПОНЕНТ ==================

interface PlagiarismCheckerProps {
  text: string;
  onApplySuggestion?: (original: string, suggestion: string) => void;
  compact?: boolean;
}

export default function PlagiarismChecker({ text, onApplySuggestion, compact = false }: PlagiarismCheckerProps) {
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);

  const handleCheck = useCallback(async () => {
    if (!text || text.length < 100) {
      setError('Текст должен содержать минимум 100 символов');
      return;
    }

    setIsChecking(true);
    setError(null);
    setCheckProgress(0);

    const progressInterval = setInterval(() => {
      setCheckProgress(prev => (prev >= 90 ? prev : prev + Math.random() * 15));
    }, 800);

    try {
      const checkResult = await checkPlagiarism(text);
      setResult(checkResult);
      setCheckProgress(100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка проверки';
      setError(message);
    } finally {
      clearInterval(progressInterval);
      setIsChecking(false);
    }
  }, [text]);

  const getScoreColor = (score: number, isInverse = false) => {
    const s = isInverse ? 100 - score : score;
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Отлично';
    if (score >= 80) return 'Хорошо';
    if (score >= 60) return 'Средне';
    if (score >= 40) return 'Слабо';
    return 'Критично';
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'academic': return <BookOpen className="w-4 h-4 text-blue-400" />;
      case 'journal': return <Layers className="w-4 h-4 text-purple-400" />;
      default: return <Globe className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'border-red-500/30 bg-red-500/5';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/5';
      default: return 'border-border-primary bg-bg-tertiary';
    }
  };

  const handleExportReport = () => {
    if (!result) return;
    const report = `
ОТЧЁТ О ПРОВЕРКЕ — Science AI
═══════════════════════════════════════

Уникальность: ${result.uniquenessScore}% | AI: ${result.aiProbability}% | Источников: ${result.sourcesFound}
Слов: ${result.wordCount} | Предложений: ${result.sentenceCount}

ДЕТАЛЬНЫЕ МЕТРИКИ:
  Точные совпадения: ${result.metrics?.exactMatchPercent || 0}%
  Парафраз: ${result.metrics?.paraphraseMatchPercent || 0}%
  Лексика: ${result.metrics?.vocabularyRichness || 0}%
  Burstiness: ${result.metrics?.burstiness || 0}

РЕЗЮМЕ: ${result.analysis.summary}

СИЛЬНЫЕ СТОРОНЫ:
${result.analysis.strengths.map((s, i) => `  ${i+1}. ${s}`).join('\n')}

ИСТОЧНИКИ:
${(result.sources || []).map((s, i) => `  ${i+1}. [${s.similarity}%] ${s.title}\n     ${s.url}`).join('\n')}

ПРОБЛЕМЫ:
${result.analysis.issues.map((iss, i) => `  ${i+1}. [${iss.type}] "${iss.text}"\n     → ${iss.suggestion}`).join('\n')}

РЕКОМЕНДАЦИИ:
${result.recommendations.map((r, i) => `  ${i+1}. ${r}`).join('\n')}

Дата: ${new Date().toLocaleString('ru-RU')}
Science AI — science-ai.app
`;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plagiarism-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // COMPACT
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={handleCheck} disabled={isChecking || !text || text.length < 100}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-secondary border border-border-primary transition-all text-sm disabled:opacity-50">
          {isChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
          <span>Проверка</span>
        </button>
        {result && (
          <div className="flex items-center gap-3 text-sm">
            <div className={`flex items-center gap-1 ${getScoreColor(result.uniquenessScore)}`}>
              <CheckCircle className="w-4 h-4" /><span>{result.uniquenessScore}%</span>
            </div>
            <div className={`flex items-center gap-1 ${getScoreColor(result.aiProbability, true)}`}>
              <Shield className="w-4 h-4" /><span>{result.aiProbability}% AI</span>
            </div>
            {result.sourcesFound > 0 && (
              <div className="flex items-center gap-1 text-text-muted">
                <Globe className="w-4 h-4" /><span>{result.sourcesFound} ист.</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // FULL
  return (
    <div className="rounded-2xl bg-bg-secondary border border-border-primary overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileSearch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-lg">Проверка на плагиат</h3>
              <p className="text-xs text-text-muted">CrossRef + Semantic Scholar + AI-анализ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCheck} disabled={isChecking || !text || text.length < 100}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {isChecking ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Проверяем...</span></> :
                <><Target className="w-4 h-4" /><span>Проверить</span></>}
            </button>
            {result && (
              <button onClick={handleExportReport}
                className="p-2.5 rounded-xl bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary transition-all" title="Скачать отчёт">
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center gap-2 text-red-400"><XCircle className="w-5 h-5" /><span>{error}</span></div>
        </div>
      )}

      {/* Loading */}
      {isChecking && (
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary mb-1">Анализируем текст...</p>
              <p className="text-xs text-text-muted">
                {checkProgress < 25 ? 'Поиск в научных базах данных...' :
                 checkProgress < 50 ? 'Проверка CrossRef и Semantic Scholar...' :
                 checkProgress < 75 ? 'Анализ AI-паттернов и статистики...' :
                 'Подготовка отчёта...'}
              </p>
            </div>
            <span className="text-sm font-mono text-text-muted">{Math.round(checkProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              initial={{ width: '0%' }} animate={{ width: `${checkProgress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !isChecking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
            {/* Main Scores */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              {/* Uniqueness */}
              <div className="p-4 rounded-xl bg-bg-tertiary text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-bg-secondary" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5"
                      strokeDasharray={`${result.uniquenessScore * 1.76} 176`} className={getScoreColor(result.uniquenessScore)} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${getScoreColor(result.uniquenessScore)}`}>{result.uniquenessScore}%</span>
                  </div>
                </div>
                <div className="text-sm font-medium text-text-primary">Уникальность</div>
                <div className={`text-xs ${getScoreColor(result.uniquenessScore)}`}>{getScoreLabel(result.uniquenessScore)}</div>
              </div>

              {/* AI Score */}
              <div className="p-4 rounded-xl bg-bg-tertiary text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-bg-secondary" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5"
                      strokeDasharray={`${result.aiProbability * 1.76} 176`} className={getScoreColor(result.aiProbability, true)} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${getScoreColor(result.aiProbability, true)}`}>{result.aiProbability}%</span>
                  </div>
                </div>
                <div className="text-sm font-medium text-text-primary">AI Вероятность</div>
                <div className={`text-xs ${getScoreColor(result.aiProbability, true)}`}>
                  {result.aiProbability < 30 ? 'Человек' : result.aiProbability < 60 ? 'Смешанный' : 'AI-текст'}
                </div>
              </div>

              {/* Sources */}
              <div className="p-4 rounded-xl bg-bg-tertiary text-center">
                <div className="text-2xl font-bold text-blue-400 mb-2">{result.sourcesFound}</div>
                <div className="text-sm font-medium text-text-primary">Источников</div>
                <div className="text-xs text-text-muted">найдено</div>
              </div>

              {/* Words */}
              <div className="p-4 rounded-xl bg-bg-tertiary text-center">
                <div className="text-2xl font-bold text-text-primary mb-2">{result.wordCount.toLocaleString()}</div>
                <div className="text-sm font-medium text-text-muted">Слов</div>
                <div className="text-xs text-text-muted">{result.sentenceCount} предл.</div>
              </div>

              {/* Issues */}
              <div className="p-4 rounded-xl bg-bg-tertiary text-center">
                <div className={`text-2xl font-bold ${result.analysis.issues.length > 5 ? 'text-red-400' : result.analysis.issues.length > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {result.analysis.issues.length}
                </div>
                <div className="text-sm font-medium text-text-muted">Проблем</div>
                <div className="text-xs text-text-muted">найдено</div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-bg-tertiary mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-text-primary">Резюме анализа</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.analysis.summary}</p>
            </div>

            {/* Strengths */}
            {result.analysis.strengths.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-medium text-text-primary">Сильные стороны</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.analysis.strengths.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm border border-green-500/20">&#10003; {s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Sources Found */}
            {result.sources && result.sources.length > 0 && (
              <div className="mb-4">
                <button onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-2 w-full p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-blue-400">Найденные источники ({result.sources.length})</span>
                  <span className="flex-1" />
                  {showSources ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
                </button>
                <AnimatePresence>
                  {showSources && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2 overflow-hidden">
                      {result.sources.map((source, i) => (
                        <div key={i} className="p-3 rounded-xl bg-bg-tertiary border border-border-primary hover:border-blue-500/30 transition-colors">
                          <div className="flex items-start gap-3">
                            {getSourceIcon(source.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-text-primary truncate">{source.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  source.similarity > 60 ? 'bg-red-500/20 text-red-400' :
                                  source.similarity > 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                                }`}>{source.similarity}%</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted">
                                  {source.type === 'academic' ? 'Научная' : source.type === 'journal' ? 'Журнал' : 'Веб'}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted line-clamp-2">{source.snippet}</p>
                              <a href={source.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors">
                                <ExternalLink className="w-3 h-3" /> Открыть источник
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Metrics */}
            {result.metrics && (
              <div className="mb-4">
                <button onClick={() => setShowMetrics(!showMetrics)}
                  className="flex items-center gap-2 w-full p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-colors">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-purple-400">Детальные метрики</span>
                  <span className="flex-1" />
                  {showMetrics ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                </button>
                <AnimatePresence>
                  {showMetrics && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 overflow-hidden">
                      {[
                        { label: 'Точные совпадения', value: `${result.metrics.exactMatchPercent}%`, good: result.metrics.exactMatchPercent < 10 },
                        { label: 'Парафраз. совпадения', value: `${result.metrics.paraphraseMatchPercent}%`, good: result.metrics.paraphraseMatchPercent < 15 },
                        { label: 'Покрытие цитатами', value: `${result.metrics.citationCoverage}%`, good: result.metrics.citationCoverage > 20 },
                        { label: 'Богатство лексики', value: `${result.metrics.vocabularyRichness}%`, good: result.metrics.vocabularyRichness > 45 },
                        { label: 'Burstiness', value: result.metrics.burstiness.toFixed(2), good: result.metrics.burstiness > 0.4 },
                        { label: 'Perplexity', value: result.metrics.perplexity.toFixed(1), good: result.metrics.perplexity > 8 },
                      ].map((m, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${m.good ? 'border-green-500/20 bg-green-500/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
                          <div className="text-xs text-text-muted mb-1">{m.label}</div>
                          <div className={`text-lg font-bold ${m.good ? 'text-green-400' : 'text-orange-400'}`}>{m.value}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Issues */}
            {result.analysis.issues.length > 0 && (
              <div className="mb-4">
                <button onClick={() => setShowIssues(!showIssues)}
                  className="flex items-center gap-2 w-full p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-colors">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="font-medium text-orange-400">Проблемы ({result.analysis.issues.length})</span>
                  <span className="flex-1" />
                  {showIssues ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-orange-400" />}
                </button>
                <AnimatePresence>
                  {showIssues && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2 overflow-hidden">
                      {result.analysis.issues.map((issue, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${getSeverityColor(issue.severity)}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            {issue.type === 'ai_pattern' ? <Shield className="w-4 h-4 text-purple-400" /> :
                             issue.type === 'plagiarism' ? <XCircle className="w-4 h-4 text-red-400" /> :
                             <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                            <span className="text-xs font-medium text-text-muted uppercase">
                              {issue.type === 'ai_pattern' ? 'AI-паттерн' : issue.type === 'plagiarism' ? 'Плагиат' : issue.type === 'cliche' ? 'Клише' : issue.type}
                            </span>
                            {issue.severity && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                issue.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                                issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-text-secondary'
                              }`}>{issue.severity === 'high' ? 'Высокий' : issue.severity === 'medium' ? 'Средний' : 'Низкий'}</span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mb-1.5 italic">"{issue.text}"</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-green-400">&rarr; {issue.suggestion}</p>
                            {onApplySuggestion && issue.type === 'ai_pattern' && (
                              <button onClick={() => onApplySuggestion(issue.text, issue.suggestion)}
                                className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors" title="Применить">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <button onClick={() => setShowRecommendations(!showRecommendations)}
                  className="flex items-center gap-2 w-full p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium text-emerald-400">Рекомендации ({result.recommendations.length})</span>
                  <span className="flex-1" />
                  {showRecommendations ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
                </button>
                <AnimatePresence>
                  {showRecommendations && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2 overflow-hidden">
                      {result.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-bg-tertiary border border-border-primary">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-sm text-text-secondary">{rec}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !isChecking && !error && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">Мультидвижковая проверка</p>
          <p className="text-xs text-text-muted mb-3">CrossRef + Semantic Scholar + AI-анализ</p>
          <p className="text-xs text-text-muted">Нажмите "Проверить" для запуска (мин. 100 символов)</p>
        </div>
      )}
    </div>
  );
}

export type { PlagiarismResult, PlagiarismIssue };
