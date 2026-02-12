import React, { useState, useCallback } from 'react';
import {
  analyzeText,
  humanizeTextAdvanced,
  quickHumanize,
  aggressiveHumanize,
  academicHumanize,
  TextAnalysis,
  HumanizationOptions,
} from '../services/antiAIDetection';

interface AntiAIDetectionProps {
  initialText?: string;
  onTextChange?: (text: string) => void;
  compact?: boolean;
}

export const AntiAIDetection: React.FC<AntiAIDetectionProps> = ({
  initialText = '',
  onTextChange,
  compact = false,
}) => {
  const [text, setText] = useState(initialText);
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [humanizationMode, setHumanizationMode] = useState<'quick' | 'academic' | 'aggressive'>('academic');

  // Анализ текста
  const handleAnalyze = useCallback(() => {
    if (!text.trim()) return;
    
    setIsAnalyzing(true);
    setOriginalText(text);
    
    // Имитируем асинхронность для UX
    setTimeout(() => {
      const result = analyzeText(text);
      setAnalysis(result);
      setIsAnalyzing(false);
    }, 300);
  }, [text]);

  // Гуманизация
  const handleHumanize = useCallback(() => {
    if (!text.trim()) return;
    
    setIsHumanizing(true);
    setOriginalText(text);
    
    setTimeout(() => {
      let humanized: string;
      
      switch (humanizationMode) {
        case 'quick':
          humanized = quickHumanize(text);
          break;
        case 'aggressive':
          humanized = aggressiveHumanize(text);
          break;
        case 'academic':
        default:
          humanized = academicHumanize(text);
      }
      
      setText(humanized);
      onTextChange?.(humanized);
      
      // Анализируем результат
      const result = analyzeText(humanized);
      setAnalysis(result);
      setShowDiff(true);
      setIsHumanizing(false);
    }, 500);
  }, [text, humanizationMode, onTextChange]);

  // Возврат к оригиналу
  const handleRevert = useCallback(() => {
    if (originalText) {
      setText(originalText);
      onTextChange?.(originalText);
      setShowDiff(false);
      setAnalysis(analyzeText(originalText));
    }
  }, [originalText, onTextChange]);

  // Цвет для скора
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  // Иконка для скора
  const getScoreIcon = (score: number) => {
    if (score >= 80) return '✅';
    if (score >= 60) return '⚠️';
    return '❌';
  };

  if (compact) {
    return (
      <div className="bg-bg-tertiary rounded-lg p-4">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-text-secondary text-sm">Anti-AI Detection</span>
          {analysis && (
            <span className={`font-bold ${getScoreColor(analysis.humanScore)}`}>
              {getScoreIcon(analysis.humanScore)} {Math.round(analysis.humanScore)}%
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !text.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
          >
            {isAnalyzing ? '...' : 'Проверить'}
          </button>
          <button
            onClick={handleHumanize}
            disabled={isHumanizing || !text.trim()}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
          >
            {isHumanizing ? '...' : 'Гуманизировать'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          🛡️ Anti-AI Detection System
        </h2>
        
        {analysis && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(analysis.humanScore)}`}>
                {Math.round(analysis.humanScore)}%
              </div>
              <div className="text-xs text-text-secondary">Человечность</div>
            </div>
          </div>
        )}
      </div>

      {/* Text Input */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTextChange?.(e.target.value);
          }}
          placeholder="Вставьте текст для анализа и гуманизации..."
          className="w-full h-64 bg-bg-tertiary text-text-primary rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="absolute bottom-3 right-3 text-text-muted text-sm">
          {text.length} символов
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !text.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⟳</span> Анализ...
            </span>
          ) : (
            '🔍 Анализировать'
          )}
        </button>

        <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg p-1">
          {(['academic', 'quick', 'aggressive'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setHumanizationMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm transition ${
                humanizationMode === mode
                  ? 'bg-purple-600 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {mode === 'academic' && '📚 Академический'}
              {mode === 'quick' && '⚡ Быстрый'}
              {mode === 'aggressive' && '🔥 Агрессивный'}
            </button>
          ))}
        </div>

        <button
          onClick={handleHumanize}
          disabled={isHumanizing || !text.trim()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isHumanizing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⟳</span> Обработка...
            </span>
          ) : (
            '✨ Гуманизировать'
          )}
        </button>

        {showDiff && originalText && (
          <button
            onClick={handleRevert}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
          >
            ↩️ Вернуть оригинал
          </button>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scores */}
          <div className="bg-bg-tertiary rounded-xl p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Показатели</h3>
            
            <div className="space-y-4">
              {/* Human Score */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Человечность</span>
                  <span className={getScoreColor(analysis.humanScore)}>
                    {Math.round(analysis.humanScore)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      analysis.humanScore >= 80 ? 'bg-green-500' :
                      analysis.humanScore >= 60 ? 'bg-yellow-500' :
                      analysis.humanScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.humanScore}%` }}
                  />
                </div>
              </div>

              {/* Perplexity */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Перплексия</span>
                  <span className={getScoreColor(analysis.perplexityScore)}>
                    {Math.round(analysis.perplexityScore)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${analysis.perplexityScore}%` }}
                  />
                </div>
              </div>

              {/* Burstiness */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Вариативность</span>
                  <span className={getScoreColor(analysis.burstyScore)}>
                    {Math.round(analysis.burstyScore)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${analysis.burstyScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Patterns Found */}
          <div className="bg-bg-tertiary rounded-xl p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-4">
              AI-паттерны ({analysis.aiPatterns.length})
            </h3>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {analysis.aiPatterns.length === 0 ? (
                <p className="text-green-400 text-sm">✅ Паттернов не найдено</p>
              ) : (
                analysis.aiPatterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="text-sm bg-red-900/30 text-red-300 px-2 py-1 rounded"
                  >
                    "{pattern}"
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-bg-tertiary rounded-xl p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Рекомендации</h3>
            
            <div className="space-y-2">
              {analysis.suggestions.length === 0 ? (
                <p className="text-green-400 text-sm">✅ Текст готов к использованию</p>
              ) : (
                analysis.suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-yellow-300 flex items-start gap-2"
                  >
                    <span>💡</span>
                    <span>{suggestion}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {analysis && (
        <div className={`text-center py-3 rounded-lg ${
          analysis.humanScore >= 80 ? 'bg-green-900/30 text-green-400' :
          analysis.humanScore >= 60 ? 'bg-yellow-900/30 text-yellow-400' :
          'bg-red-900/30 text-red-400'
        }`}>
          {analysis.humanScore >= 80 ? (
            '✅ Текст с высокой вероятностью пройдёт проверку AI-детекторов'
          ) : analysis.humanScore >= 60 ? (
            '⚠️ Текст может вызвать подозрения. Рекомендуется дополнительная обработка'
          ) : (
            '❌ Текст с высокой вероятностью будет определён как AI-сгенерированный'
          )}
        </div>
      )}

      {/* Tips */}
      <div className="bg-bg-tertiary/50 rounded-lg p-4 text-sm text-text-secondary">
        <strong className="text-text-primary">💡 Советы для лучшего результата:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>После гуманизации отредактируйте 10-15% текста вручную</li>
          <li>Добавьте личные примеры и наблюдения</li>
          <li>Используйте реальные цитаты из источников</li>
          <li>Меняйте структуру: иногда короткий абзац, иногда длинный</li>
        </ul>
      </div>
    </div>
  );
};

export default AntiAIDetection;
