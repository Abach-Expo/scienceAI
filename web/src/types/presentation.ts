// ==================== PRESENTATION TYPES ====================

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart' | 'icon' | 'list' | 'quote' | 'code' | 'video' | 'table';
  content: string | Record<string, unknown>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, string | number>;
  animation?: SlideAnimation;
}

export interface SlideAnimation {
  type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'flip' | 'rotate' | 'blur' | 'glow';
  direction?: 'left' | 'right' | 'up' | 'down';
  delay: number;
  duration: number;
}

export interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  imagePrompt?: string;
  imageSource?: 'unsplash' | 'dalle' | 'pexels';
  isGeneratingImage?: boolean;
  layout: SlideLayout;
  layoutVariant?: number;
  titleAlignment?: 'left' | 'center' | 'right';
  elements: SlideElement[];
  background: SlideBackground;
  transition: SlideTransition;
  notes?: string;
  duration?: number;
  quote?: string;
  quoteAuthor?: string;
  stats?: Array<{ value: string; label: string }>;
}

export type SlideLayout =
  | 'title'
  | 'title-subtitle'
  | 'content'
  | 'content-image'
  | 'image-content'
  | 'two-column'
  | 'three-column'
  | 'full-image'
  | 'quote'
  | 'comparison'
  | 'timeline'
  | 'team'
  | 'stats'
  | 'gallery'
  | 'video'
  | 'code'
  | 'diagram'
  | 'thank-you'
  | 'blank';

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image' | 'video' | 'pattern';
  value: string;
  overlay?: string;
  blur?: number;
}

export interface SlideTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'flip' | 'cube' | 'cover' | 'push' | 'morph';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration: number;
}

export interface PresentationTheme {
  id: string;
  name: string;
  nameEn: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textMuted: string;
  fontFamily: string;
  headingFont: string;
  gradient?: string;
  pattern?: string;
  borderRadius: string;
  shadow: string;
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  author?: string;
  subject?: string;
  theme: PresentationTheme;
  slides: Slide[];
  aspectRatio: '16:9' | '4:3' | '16:10' | '9:16';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
