/**
 * 🎨 USER STYLE PERSONALIZATION STORE
 * Персонализация стиля AI под предпочтения пользователя
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ================== ТИПЫ ==================

export interface WritingSample {
  id: string;
  text: string;
  source: 'user_input' | 'approved_generation' | 'edited_generation';
  createdAt: Date;
}

export interface StylePreferences {
  // Формальность
  formality: 'casual' | 'neutral' | 'formal' | 'academic';
  
  // Длина предложений
  sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  
  // Использование терминов
  terminology: 'simple' | 'moderate' | 'technical' | 'expert';
  
  // Эмоциональность
  emotion: 'minimal' | 'neutral' | 'expressive' | 'passionate';
  
  // Структура
  structure: 'freeform' | 'paragraphs' | 'lists' | 'headings';
  
  // Язык
  preferredLanguage: 'ru' | 'en' | 'mixed';
  
  // Персона
  voicePersona: 'neutral' | 'expert' | 'mentor' | 'colleague' | 'student';
}

export interface UserStyleProfile {
  id: string;
  name: string;
  description?: string;
  preferences: StylePreferences;
  writingSamples: WritingSample[];
  generatedPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

interface UserStyleState {
  // Профили пользователя
  profiles: UserStyleProfile[];
  activeProfileId: string | null;
  
  // Настройки
  autoLearn: boolean;
  minSamplesForLearning: number;
  
  // Статистика
  totalGenerations: number;
  approvedGenerations: number;
  editedGenerations: number;
  
  // Действия
  createProfile: (name: string, description?: string) => UserStyleProfile;
  updateProfile: (id: string, updates: Partial<UserStyleProfile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  
  // Образцы стиля
  addWritingSample: (profileId: string, text: string, source: WritingSample['source']) => void;
  removeWritingSample: (profileId: string, sampleId: string) => void;
  
  // Обучение
  recordGeneration: (approved: boolean, edited: boolean) => void;
  learnFromText: (text: string) => void;
  generateStylePrompt: (profileId: string) => string;
  
  // Применение
  getActiveStylePrompt: () => string;
  getStyleInstructions: () => string;
}

// ================== ШАБЛОНЫ СТИЛЕЙ ==================

const DEFAULT_PREFERENCES: StylePreferences = {
  formality: 'neutral',
  sentenceLength: 'medium',
  terminology: 'moderate',
  emotion: 'neutral',
  structure: 'paragraphs',
  preferredLanguage: 'ru',
  voicePersona: 'neutral',
};

const PRESET_PROFILES: Record<string, StylePreferences> = {
  academic: {
    formality: 'academic',
    sentenceLength: 'long',
    terminology: 'expert',
    emotion: 'minimal',
    structure: 'headings',
    preferredLanguage: 'ru',
    voicePersona: 'expert',
  },
  casual: {
    formality: 'casual',
    sentenceLength: 'short',
    terminology: 'simple',
    emotion: 'expressive',
    structure: 'freeform',
    preferredLanguage: 'ru',
    voicePersona: 'colleague',
  },
  professional: {
    formality: 'formal',
    sentenceLength: 'medium',
    terminology: 'technical',
    emotion: 'neutral',
    structure: 'lists',
    preferredLanguage: 'ru',
    voicePersona: 'expert',
  },
  creative: {
    formality: 'neutral',
    sentenceLength: 'varied',
    terminology: 'moderate',
    emotion: 'passionate',
    structure: 'freeform',
    preferredLanguage: 'ru',
    voicePersona: 'mentor',
  },
};

// ================== ГЕНЕРАЦИЯ ПРОМПТОВ ==================

function generatePromptFromPreferences(prefs: StylePreferences): string {
  const parts: string[] = [];
  
  // Формальность
  const formalityMap = {
    casual: 'Используй разговорный, непринуждённый стиль.',
    neutral: 'Используй нейтральный, сбалансированный стиль.',
    formal: 'Используй формальный, деловой стиль.',
    academic: 'Используй академический, научный стиль с терминологией.',
  };
  parts.push(formalityMap[prefs.formality]);
  
  // Длина предложений
  const lengthMap = {
    short: 'Предложения должны быть короткими и ёмкими.',
    medium: 'Используй предложения средней длины.',
    long: 'Можно использовать развёрнутые, сложные предложения.',
    varied: 'Чередуй короткие и длинные предложения для ритма.',
  };
  parts.push(lengthMap[prefs.sentenceLength]);
  
  // Терминология
  const termMap = {
    simple: 'Избегай сложных терминов, объясняй простым языком.',
    moderate: 'Используй умеренно специализированную лексику.',
    technical: 'Активно используй профессиональные термины.',
    expert: 'Используй экспертную терминологию без упрощений.',
  };
  parts.push(termMap[prefs.terminology]);
  
  // Эмоциональность
  const emotionMap = {
    minimal: 'Текст должен быть сухим и фактическим.',
    neutral: 'Сохраняй нейтральный эмоциональный тон.',
    expressive: 'Допускается выразительность и эмоциональные акценты.',
    passionate: 'Текст может быть страстным и вовлекающим.',
  };
  parts.push(emotionMap[prefs.emotion]);
  
  // Структура
  const structureMap = {
    freeform: 'Свободная структура без жёстких рамок.',
    paragraphs: 'Структурируй текст абзацами.',
    lists: 'Активно используй списки и перечисления.',
    headings: 'Используй заголовки и подзаголовки для структуры.',
  };
  parts.push(structureMap[prefs.structure]);
  
  // Персона
  const personaMap = {
    neutral: '',
    expert: 'Пиши как эксперт в своей области.',
    mentor: 'Пиши как наставник, объясняющий коллеге.',
    colleague: 'Пиши как коллега, обсуждающий тему.',
    student: 'Пиши как студент, изучающий тему.',
  };
  if (personaMap[prefs.voicePersona]) {
    parts.push(personaMap[prefs.voicePersona]);
  }
  
  return parts.join(' ');
}

function analyzeTextStyle(samples: WritingSample[]): Partial<StylePreferences> {
  if (samples.length === 0) return {};
  
  const allText = samples.map(s => s.text).join(' ');
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim());
  const avgSentenceLength = sentences.reduce((a, s) => a + s.split(' ').length, 0) / sentences.length;
  
  const detected: Partial<StylePreferences> = {};
  
  // Определяем длину предложений
  if (avgSentenceLength < 10) detected.sentenceLength = 'short';
  else if (avgSentenceLength < 20) detected.sentenceLength = 'medium';
  else detected.sentenceLength = 'long';
  
  // Определяем формальность по ключевым словам
  const casualWords = /привет|окей|ок|норм|круто|классно|ага|угу/gi;
  const formalWords = /уважаемый|прошу|извините|благодарю|настоящим|согласно/gi;
  const academicWords = /исследование|методология|гипотеза|анализ|результаты|выводы/gi;
  
  const casualCount = (allText.match(casualWords) || []).length;
  const formalCount = (allText.match(formalWords) || []).length;
  const academicCount = (allText.match(academicWords) || []).length;
  
  if (academicCount > 3) detected.formality = 'academic';
  else if (formalCount > casualCount) detected.formality = 'formal';
  else if (casualCount > 2) detected.formality = 'casual';
  
  // Определяем структуру
  const hasLists = /^[-•*]\s/m.test(allText) || /^\d+\.\s/m.test(allText);
  const hasHeadings = /^#{1,6}\s|^[A-ZА-ЯЁ][^.!?]*:$/m.test(allText);
  
  if (hasHeadings) detected.structure = 'headings';
  else if (hasLists) detected.structure = 'lists';
  
  return detected;
}

// ================== STORE ==================

export const useUserStyleStore = create<UserStyleState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      profiles: [],
      activeProfileId: null,
      autoLearn: true,
      minSamplesForLearning: 3,
      totalGenerations: 0,
      approvedGenerations: 0,
      editedGenerations: 0,
      
      // Создание профиля
      createProfile: (name, description) => {
        const newProfile: UserStyleProfile = {
          id: Date.now().toString(),
          name,
          description,
          preferences: { ...DEFAULT_PREFERENCES },
          writingSamples: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: false,
        };
        
        set(state => ({
          profiles: [...state.profiles, newProfile],
        }));
        
        return newProfile;
      },
      
      // Обновление профиля
      updateProfile: (id, updates) => {
        set(state => ({
          profiles: state.profiles.map(p =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date() }
              : p
          ),
        }));
      },
      
      // Удаление профиля
      deleteProfile: (id) => {
        set(state => ({
          profiles: state.profiles.filter(p => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },
      
      // Установка активного профиля
      setActiveProfile: (id) => {
        set(state => ({
          activeProfileId: id,
          profiles: state.profiles.map(p => ({
            ...p,
            isActive: p.id === id,
          })),
        }));
      },
      
      // Добавление образца стиля
      addWritingSample: (profileId, text, source) => {
        const sample: WritingSample = {
          id: Date.now().toString(),
          text,
          source,
          createdAt: new Date(),
        };
        
        set(state => ({
          profiles: state.profiles.map(p =>
            p.id === profileId
              ? {
                  ...p,
                  writingSamples: [...p.writingSamples, sample].slice(-20), // Max 20 samples
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        
        // Автообучение
        const { autoLearn, minSamplesForLearning } = get();
        const profile = get().profiles.find(p => p.id === profileId);
        
        if (autoLearn && profile && profile.writingSamples.length >= minSamplesForLearning) {
          const learned = analyzeTextStyle(profile.writingSamples);
          get().updateProfile(profileId, {
            preferences: { ...profile.preferences, ...learned },
          });
        }
      },
      
      // Удаление образца
      removeWritingSample: (profileId, sampleId) => {
        set(state => ({
          profiles: state.profiles.map(p =>
            p.id === profileId
              ? {
                  ...p,
                  writingSamples: p.writingSamples.filter(s => s.id !== sampleId),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
      },
      
      // Запись статистики генерации
      recordGeneration: (approved, edited) => {
        set(state => ({
          totalGenerations: state.totalGenerations + 1,
          approvedGenerations: state.approvedGenerations + (approved ? 1 : 0),
          editedGenerations: state.editedGenerations + (edited ? 1 : 0),
        }));
      },
      
      // Обучение на тексте
      learnFromText: (text) => {
        const { activeProfileId } = get();
        if (activeProfileId) {
          get().addWritingSample(activeProfileId, text, 'approved_generation');
        }
      },
      
      // Генерация промпта стиля
      generateStylePrompt: (profileId) => {
        const profile = get().profiles.find(p => p.id === profileId);
        if (!profile) return '';
        
        let prompt = generatePromptFromPreferences(profile.preferences);
        
        // Добавляем примеры если есть
        if (profile.writingSamples.length > 0) {
          const examples = profile.writingSamples
            .slice(-3)
            .map(s => `"${s.text.slice(0, 200)}..."`)
            .join('\n');
          
          prompt += `\n\nПримеры предпочитаемого стиля:\n${examples}`;
        }
        
        // Сохраняем сгенерированный промпт
        get().updateProfile(profileId, { generatedPrompt: prompt });
        
        return prompt;
      },
      
      // Получение активного промпта
      getActiveStylePrompt: () => {
        const { activeProfileId, profiles } = get();
        if (!activeProfileId) return '';
        
        const profile = profiles.find(p => p.id === activeProfileId);
        if (!profile) return '';
        
        return profile.generatedPrompt || get().generateStylePrompt(activeProfileId);
      },
      
      // Получение инструкций стиля для AI
      getStyleInstructions: () => {
        const prompt = get().getActiveStylePrompt();
        if (!prompt) return '';
        
        return `
=== СТИЛЬ ПОЛЬЗОВАТЕЛЯ ===
${prompt}
=========================
Следуй этим стилевым предпочтениям при генерации текста.
`;
      },
    }),
    {
      name: 'user-style-storage',
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        autoLearn: state.autoLearn,
        totalGenerations: state.totalGenerations,
        approvedGenerations: state.approvedGenerations,
        editedGenerations: state.editedGenerations,
      }),
    }
  )
);

// ================== ХЕЛПЕРЫ ==================

/**
 * Создаёт профиль из пресета
 */
export function createPresetProfile(
  presetName: keyof typeof PRESET_PROFILES,
  customName?: string
): UserStyleProfile | null {
  const preset = PRESET_PROFILES[presetName];
  if (!preset) return null;
  
  const store = useUserStyleStore.getState();
  const profile = store.createProfile(
    customName || `Профиль: ${presetName}`,
    `Создан из пресета "${presetName}"`
  );
  
  store.updateProfile(profile.id, { preferences: preset });
  
  return store.profiles.find(p => p.id === profile.id) || null;
}

/**
 * Применяет стиль к тексту (добавляет инструкции)
 */
export function applyStyleToPrompt(basePrompt: string): string {
  const styleInstructions = useUserStyleStore.getState().getStyleInstructions();
  
  if (!styleInstructions) return basePrompt;
  
  return `${styleInstructions}\n\n${basePrompt}`;
}

/**
 * Записывает feedback пользователя
 */
export function recordUserFeedback(
  generatedText: string,
  action: 'approved' | 'edited' | 'rejected',
  editedText?: string
) {
  const store = useUserStyleStore.getState();
  
  if (action === 'approved') {
    store.recordGeneration(true, false);
    store.learnFromText(generatedText);
  } else if (action === 'edited' && editedText) {
    store.recordGeneration(false, true);
    store.learnFromText(editedText);
  } else {
    store.recordGeneration(false, false);
  }
}

// ================== ЭКСПОРТ ==================

export { PRESET_PROFILES, DEFAULT_PREFERENCES };
export default useUserStyleStore;
