import { describe, it, expect } from 'vitest';
import type { 
  Slide, SlideLayout, PresentationTheme, Presentation, 
  ChatMessage, ParsedSlideData 
} from '../pages/presentations/types';

describe('presentation types', () => {
  it('should allow creating a valid Slide', () => {
    const slide: Slide = {
      id: 'slide-1',
      title: 'Test Slide',
      layout: 'content',
      elements: [],
      background: { type: 'solid', value: '#000000' },
      transition: { type: 'fade', duration: 0.5 },
    };

    expect(slide.id).toBe('slide-1');
    expect(slide.layout).toBe('content');
  });

  it('should support all layout types', () => {
    const layouts: SlideLayout[] = [
      'title', 'title-subtitle', 'content', 'content-image', 'image-content',
      'two-column', 'three-column', 'full-image', 'quote', 'comparison',
      'timeline', 'team', 'stats', 'gallery', 'video', 'code', 'diagram',
      'thank-you', 'blank',
    ];
    
    expect(layouts).toHaveLength(19);
  });

  it('should allow creating a Presentation', () => {
    const theme: PresentationTheme = {
      id: 'modern-dark',
      name: 'Modern Dark',
      nameEn: 'Modern Dark',
      primaryColor: '#8B5CF6',
      secondaryColor: '#06B6D4',
      accentColor: '#F59E0B',
      backgroundColor: '#0F172A',
      surfaceColor: '#1E293B',
      textColor: '#F8FAFC',
      textMuted: '#94A3B8',
      fontFamily: 'Inter, sans-serif',
      headingFont: 'Inter, sans-serif',
      borderRadius: '1rem',
      shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    };

    const presentation: Presentation = {
      id: 'pres-1',
      title: 'Test Presentation',
      theme,
      slides: [],
      aspectRatio: '16:9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(presentation.title).toBe('Test Presentation');
    expect(presentation.aspectRatio).toBe('16:9');
  });

  it('should allow ChatMessage with system role', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'system',
      content: 'Hello',
      timestamp: new Date(),
    };

    expect(msg.role).toBe('system');
  });

  it('should allow ParsedSlideData with optional fields', () => {
    const data: ParsedSlideData = {
      title: 'Slide Title',
    };

    expect(data.title).toBe('Slide Title');
    expect(data.bulletPoints).toBeUndefined();
  });
});
