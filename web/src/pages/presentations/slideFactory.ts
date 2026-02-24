import type { Slide, SlideLayout } from './types';

export const createDefaultSlide = (layout: SlideLayout = 'content', index: number = 0): Slide => ({
  id: `slide-${Date.now()}-${index}`,
  title: index === 0 ? 'Новая презентация' : `Слайд ${index + 1}`,
  subtitle: index === 0 ? 'Подзаголовок презентации' : undefined,
  content: '',
  bulletPoints: [],
  layout,
  elements: [],
  background: {
    type: 'solid',
    value: 'transparent',
  },
  transition: {
    type: 'fade',
    duration: 0.5,
  },
  notes: '',
});
