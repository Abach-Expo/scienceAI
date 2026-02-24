import type { Slide, PresentationTheme } from './types';

/**
 * Renders a slide to an HTML string for export purposes.
 * Pure function with no side effects.
 */
export function renderSlideHTML(slide: Slide, theme: PresentationTheme, index: number): string {
  const layout = slide.layout;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _variant = slide.layoutVariant || 1;
  
  // Background orbs for special slides
  const bgOrbs = `
    <div class="bg-orb bg-orb-1"></div>
    <div class="bg-orb bg-orb-2"></div>
    <div class="grid-pattern"></div>
  `;
  
  switch (layout) {
    case 'title':
    case 'title-subtitle':
      return `
        ${bgOrbs}
        <div class="slide-inner layout-title">
          <div class="badge animate-up">
            <span class="badge-dot"></span>
            <span>Презентация</span>
          </div>
          <h1 class="slide-title title-huge gradient-text animate-up animate-delay-1">${slide.title}</h1>
          ${slide.subtitle ? `<p class="slide-subtitle animate-up animate-delay-2">${slide.subtitle}</p>` : ''}
          ${slide.content ? `<p class="slide-content animate-up animate-delay-3">${slide.content}</p>` : ''}
        </div>
      `;
      
    case 'content':
      return `
        <div class="grid-pattern"></div>
        <div class="slide-inner layout-content">
          <div class="badge animate-left">
            <span class="badge-dot"></span>
            <span>Раздел ${index}</span>
          </div>
          <h2 class="slide-title animate-up">${slide.title}</h2>
          ${slide.content ? `<p class="slide-content animate-up animate-delay-1">${slide.content}</p>` : ''}
          ${slide.bulletPoints?.length ? `
            <ul class="bullet-list">
              ${slide.bulletPoints.map((point, i) => `
                <li class="bullet-item animate-left animate-delay-${Math.min(i + 2, 5)}">
                  <span class="bullet-number">${i + 1}</span>
                  <span class="bullet-text">${point}</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      `;
      
    case 'content-image':
      return `
        <div class="grid-pattern"></div>
        <div class="slide-inner layout-content-image">
          <div style="display: flex; flex-direction: column; justify-content: center;">
            <div class="badge animate-left">
              <span class="badge-dot"></span>
              <span>Ключевой момент</span>
            </div>
            <h2 class="slide-title animate-up">${slide.title}</h2>
            ${slide.content ? `<p class="slide-content animate-up animate-delay-1">${slide.content}</p>` : ''}
            ${slide.bulletPoints?.length ? `
              <ul class="bullet-list">
                ${slide.bulletPoints.map((point, i) => `
                  <li class="bullet-item animate-left animate-delay-${Math.min(i + 2, 5)}">
                    <span class="bullet-number">${i + 1}</span>
                    <span class="bullet-text">${point}</span>
                  </li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
          <div class="image-frame animate-scale animate-delay-2" style="aspect-ratio: 4/3;">
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || 'Slide image'}">` : '<div style="height: 300px; display: flex; align-items: center; justify-content: center; font-size: 48px;">🖼️</div>'}
          </div>
        </div>
      `;
      
    case 'image-content':
      return `
        <div class="grid-pattern"></div>
        <div class="slide-inner layout-image-content">
          <div class="image-frame animate-scale" style="aspect-ratio: 4/3;">
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || 'Slide image'}">` : '<div style="height: 300px; display: flex; align-items: center; justify-content: center; font-size: 48px;">🖼️</div>'}
          </div>
          <div style="display: flex; flex-direction: column; justify-content: center;">
            <div class="badge animate-right">
              <span class="badge-dot"></span>
              <span>Ключевой момент</span>
            </div>
            <h2 class="slide-title animate-up animate-delay-1">${slide.title}</h2>
            ${slide.content ? `<p class="slide-content animate-up animate-delay-2">${slide.content}</p>` : ''}
            ${slide.bulletPoints?.length ? `
              <ul class="bullet-list">
                ${slide.bulletPoints.map((point, i) => `
                  <li class="bullet-item animate-right animate-delay-${Math.min(i + 3, 5)}">
                    <span class="bullet-number">${i + 1}</span>
                    <span class="bullet-text">${point}</span>
                  </li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        </div>
      `;
      
    case 'full-image':
      return `
        ${slide.imageUrl ? `<img class="full-image-bg" src="${slide.imageUrl}" alt="${slide.title || 'Slide image'}">` : ''}
        <div class="full-image-overlay"></div>
        <div class="full-image-content">
          <div class="badge animate-up" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-color: rgba(255,255,255,0.2);">
            <span>📸 Фокус</span>
          </div>
          <h2 class="slide-title animate-up animate-delay-1">${slide.title}</h2>
          ${slide.content ? `<p class="slide-content animate-up animate-delay-2">${slide.content}</p>` : ''}
        </div>
      `;
      
    case 'quote':
      return `
        ${bgOrbs}
        <div class="slide-inner layout-quote">
          <span class="quote-mark animate-scale">"</span>
          <blockquote class="quote-text animate-up animate-delay-1">${slide.quote || slide.content || slide.title}</blockquote>
          ${(slide.quoteAuthor || slide.subtitle) ? `
            <div class="quote-author animate-up animate-delay-3">
              <div class="quote-avatar">👤</div>
              <span class="quote-author-name">${slide.quoteAuthor || slide.subtitle}</span>
            </div>
          ` : ''}
        </div>
      `;
      
    case 'stats': {
      const stats = slide.stats || [
        { value: '85%', label: 'Эффективность' },
        { value: '2.5x', label: 'Рост' },
        { value: '10K+', label: 'Пользователей' },
      ];
      return `
        ${bgOrbs}
        <div class="slide-inner layout-stats">
          <div class="stats-header">
            <div class="badge animate-up">
              <span class="badge-dot"></span>
              <span>📊 Статистика</span>
            </div>
            <h2 class="slide-title gradient-text animate-up animate-delay-1">${slide.title}</h2>
            ${slide.content ? `<p class="slide-subtitle animate-up animate-delay-2">${slide.content}</p>` : ''}
          </div>
          ${stats.map((stat, i) => `
            <div class="stat-card animate-scale animate-delay-${Math.min(i + 3, 5)}">
              <div class="stat-value">${stat.value}</div>
              <div class="stat-label">${stat.label}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
      
    case 'thank-you':
      return `
        ${bgOrbs}
        <div class="slide-inner layout-thank-you">
          <div class="thank-you-icon animate-scale">❤️</div>
          <h1 class="slide-title title-huge gradient-text animate-up animate-delay-1">${slide.title || 'Спасибо!'}</h1>
          ${slide.content ? `<p class="slide-subtitle animate-up animate-delay-2">${slide.content}</p>` : ''}
          <div class="social-buttons animate-up animate-delay-3">
            <span class="social-btn">📧 Email</span>
            <span class="social-btn">🔗 LinkedIn</span>
            <span class="social-btn">🌐 Website</span>
          </div>
        </div>
      `;
      
    default:
      return `
        <div class="grid-pattern"></div>
        <div class="slide-inner layout-content">
          <h2 class="slide-title animate-up">${slide.title}</h2>
          ${slide.content ? `<p class="slide-content animate-up animate-delay-1">${slide.content}</p>` : ''}
          ${slide.bulletPoints?.length ? `
            <ul class="bullet-list">
              ${slide.bulletPoints.map((point, i) => `
                <li class="bullet-item animate-left animate-delay-${Math.min(i + 2, 5)}">
                  <span class="bullet-number">${i + 1}</span>
                  <span class="bullet-text">${point}</span>
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      `;
  }
}
