/**
 * 👁️ AI VISION SERVICE
 * Анализ изображений с помощью AI Vision
 */

import { API_URL } from '../config';
import { fetchWithAuth } from './apiClient';

// ================== ТИПЫ ==================

export interface ImageAnalysis {
  description: string;
  objects: string[];
  colors: string[];
  mood: string;
  suggestions: string[];
  presentationUse: {
    slideType: string;
    placement: string;
    caption: string;
  };
}

export interface VisionAnalysisResult {
  success: boolean;
  analysis: string;
  structured?: ImageAnalysis;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ================== ПРОМПТЫ ==================

const VISION_PROMPTS = {
  general: `Опиши это изображение детально. Укажи:
1. Что изображено (объекты, люди, сцена)
2. Цветовую гамму
3. Настроение/атмосферу
4. Как можно использовать в презентации`,

  presentation: `Проанализируй изображение для использования в профессиональной презентации:

Верни JSON:
{
  "description": "Подробное описание изображения",
  "objects": ["объект 1", "объект 2"],
  "colors": ["основной цвет", "акцентный цвет"],
  "mood": "настроение/атмосфера",
  "suggestions": ["как использовать 1", "как использовать 2"],
  "presentationUse": {
    "slideType": "title | content | comparison | quote | stats",
    "placement": "full-background | left-half | right-half | small-icon",
    "caption": "Предлагаемая подпись к изображению"
  }
}`,

  academic: `Проанализируй изображение для использования в научной работе. Укажи:
1. Что изображено с научной точки зрения
2. Какие данные/информацию можно извлечь
3. Как правильно подписать для академической работы
4. Ограничения использования (если есть)`,

  data: `Проанализируй изображение как источник данных:
1. Если это график/диаграмма - опиши тренды и ключевые показатели
2. Если это таблица - извлеки основные данные
3. Если это схема - опиши структуру и связи
4. Предложи как визуализировать эти данные иначе`,

  accessibility: `Создай детальное alt-описание для этого изображения для людей с нарушениями зрения. Описание должно быть:
1. Конкретным и информативным
2. Включать важные визуальные детали
3. Передавать контекст и настроение
4. Быть не длиннее 2-3 предложений`,
};

// ================== ОСНОВНЫЕ ФУНКЦИИ ==================

/**
 * Анализирует изображение по URL
 */
export async function analyzeImageUrl(
  imageUrl: string,
  promptType: keyof typeof VISION_PROMPTS = 'general'
): Promise<VisionAnalysisResult> {
  const prompt = VISION_PROMPTS[promptType];

  const response = await fetchWithAuth(`${API_URL}/ai/analyze-image`, {
    method: 'POST',
    body: JSON.stringify({
      imageUrl,
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Ошибка анализа');
  }

  // Пытаемся распарсить JSON если это presentation prompt
  let structured: ImageAnalysis | undefined;
  if (promptType === 'presentation') {
    try {
      const jsonMatch = data.analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Ignore parse errors
    }
  }

  return {
    success: true,
    analysis: data.analysis,
    structured,
    usage: data.usage,
  };
}

/**
 * Анализирует изображение из base64
 */
export async function analyzeImageBase64(
  base64: string,
  promptType: keyof typeof VISION_PROMPTS = 'general'
): Promise<VisionAnalysisResult> {
  const prompt = VISION_PROMPTS[promptType];

  const response = await fetchWithAuth(`${API_URL}/ai/analyze-image`, {
    method: 'POST',
    body: JSON.stringify({
      imageBase64: base64,
      imageUrl: '', // Required field
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Ошибка анализа');
  }

  return {
    success: true,
    analysis: data.analysis,
    usage: data.usage,
  };
}

/**
 * Конвертирует File в base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Убираем prefix data:image/...;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Анализирует File напрямую
 */
export async function analyzeImageFile(
  file: File,
  promptType: keyof typeof VISION_PROMPTS = 'general'
): Promise<VisionAnalysisResult> {
  const base64 = await fileToBase64(file);
  return analyzeImageBase64(base64, promptType);
}

/**
 * Генерирует alt-текст для изображения
 */
export async function generateAltText(imageUrl: string): Promise<string> {
  const result = await analyzeImageUrl(imageUrl, 'accessibility');
  return result.analysis;
}

/**
 * Извлекает данные из графика/таблицы
 */
export async function extractDataFromImage(imageUrl: string): Promise<string> {
  const result = await analyzeImageUrl(imageUrl, 'data');
  return result.analysis;
}

/**
 * Анализирует изображение для академических целей
 */
export async function analyzeForAcademic(imageUrl: string): Promise<string> {
  const result = await analyzeImageUrl(imageUrl, 'academic');
  return result.analysis;
}

// ================== REACT HOOK ==================

import { useState, useCallback } from 'react';

export function useVisionAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeUrl = useCallback(async (
    imageUrl: string,
    promptType: keyof typeof VISION_PROMPTS = 'general'
  ) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeImageUrl(imageUrl, promptType);
      setResult(analysisResult);
      return analysisResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeFile = useCallback(async (
    file: File,
    promptType: keyof typeof VISION_PROMPTS = 'general'
  ) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeImageFile(file, promptType);
      setResult(analysisResult);
      return analysisResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    result,
    error,
    analyzeUrl,
    analyzeFile,
    reset,
  };
}

// ================== ЭКСПОРТ ==================

export default {
  analyzeImageUrl,
  analyzeImageBase64,
  analyzeImageFile,
  fileToBase64,
  generateAltText,
  extractDataFromImage,
  analyzeForAcademic,
  useVisionAnalysis,
  VISION_PROMPTS,
};
