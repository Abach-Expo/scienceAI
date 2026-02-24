export type {
  SlideElement,
  SlideAnimation,
  Slide,
  SlideLayout,
  SlideBackground,
  SlideTransition,
  ParsedSlideData,
  ParsedPresentation,
  PresentationTheme,
  Presentation,
  ChatMessage,
  WorkspaceStep,
  UserIntent,
  IntentAnalysis,
} from './types';

export { THEMES } from './themes';
export { createDefaultSlide } from './slideFactory';
export {
  searchUnsplashPhoto,
  searchImageViaProxy,
  generateDALLE3Image,
  getRealisticPhoto,
  FALLBACK_PHOTOS,
} from './imageUtils';
export {
  LAYOUT_TEMPLATES,
  SUBJECTS,
  PRESENTATION_TEMPLATES,
  TRANSITIONS,
} from './constants';
export { renderSlideHTML } from './renderSlideHTML';
export { generatePresentationHTML, hexToRgb } from './exportHTML';
