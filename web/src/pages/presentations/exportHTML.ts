import type { Presentation, Slide, PresentationTheme } from './types';
import { renderSlideHTML } from './renderSlideHTML';

/**
 * Converts a hex color (#rrggbb) to an RGB string "r, g, b" for use in rgba().
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}

/**
 * Generates a complete standalone HTML document for a presentation.
 * Includes CSS styling, navigation controls, keyboard/touch support, and fullscreen toggle.
 */
export function generatePresentationHTML(presentation: Presentation): string {
  const theme = presentation.theme;
  
  const slidesHTML = presentation.slides.map((slide: Slide, index: number) => `
    <section class="slide" data-index="${index}" data-layout="${slide.layout}">
      ${renderSlideHTML(slide, theme, index)}
    </section>
  `).join('');
  
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${presentation.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
      --accent: ${theme.accentColor};
      --bg: ${theme.backgroundColor};
      --surface: ${theme.surfaceColor};
      --text: ${theme.textColor};
      --text-muted: ${theme.textMuted};
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Inter', ${theme.fontFamily}; 
      background: var(--bg); 
      color: var(--text);
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    
    /* GAMMA-STYLE Animations */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(40px); filter: blur(10px); }
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    
    @keyframes fadeInLeft {
      from { opacity: 0; transform: translateX(-40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes fadeInRight {
      from { opacity: 0; transform: translateX(40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.15); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    .presentation { width: 100vw; height: 100vh; position: relative; }
    
    .slide { 
      width: 100%; 
      height: 100%; 
      display: none; 
      position: absolute;
      top: 0;
      left: 0;
      overflow: hidden;
      background: var(--bg);
    }
    
    .slide.active { 
      display: flex; 
    }
    
    .slide.active .animate-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .slide.active .animate-left { animation: fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .slide.active .animate-right { animation: fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .slide.active .animate-scale { animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .slide.active .animate-delay-1 { animation-delay: 0.1s; opacity: 0; }
    .slide.active .animate-delay-2 { animation-delay: 0.2s; opacity: 0; }
    .slide.active .animate-delay-3 { animation-delay: 0.3s; opacity: 0; }
    .slide.active .animate-delay-4 { animation-delay: 0.4s; opacity: 0; }
    .slide.active .animate-delay-5 { animation-delay: 0.5s; opacity: 0; }
    
    /* GAMMA-STYLE: Background Effects */
    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      pointer-events: none;
      animation: pulse 8s ease-in-out infinite;
    }
    
    .bg-orb-1 {
      width: 500px;
      height: 500px;
      background: var(--primary);
      top: 10%;
      left: 20%;
      opacity: 0.3;
    }
    
    .bg-orb-2 {
      width: 400px;
      height: 400px;
      background: var(--secondary);
      bottom: 10%;
      right: 20%;
      opacity: 0.25;
      animation-delay: -4s;
    }
    
    /* Grid Pattern Overlay */
    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(var(--primary) 1px, transparent 1px);
      background-size: 24px 24px;
      opacity: 0.03;
      pointer-events: none;
    }
    
    /* GAMMA-STYLE: Slide Layouts */
    .slide-inner {
      width: 100%;
      height: 100%;
      display: flex;
      position: relative;
      z-index: 1;
    }
    
    .layout-title {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 80px;
    }
    
    .layout-content {
      flex-direction: column;
      padding: 80px;
    }
    
    .layout-content-image,
    .layout-image-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      padding: 60px;
      align-items: center;
    }
    
    .layout-quote {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 100px;
    }
    
    .layout-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
      padding: 60px;
      align-items: center;
    }
    
    .layout-thank-you {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 80px;
    }
    
    .layout-full-image {
      position: relative;
    }
    
    /* GAMMA-STYLE: Typography */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 100px;
      background: linear-gradient(135deg, rgba(${hexToRgb(theme.primaryColor)}, 0.1), rgba(${hexToRgb(theme.secondaryColor)}, 0.05));
      border: 1px solid rgba(${hexToRgb(theme.primaryColor)}, 0.2);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--primary);
      margin-bottom: 24px;
    }
    
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }
    
    .slide-title {
      font-size: 4rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1.1;
      margin-bottom: 24px;
      text-shadow: 0 4px 30px rgba(${hexToRgb(theme.primaryColor)}, 0.3);
    }
    
    .slide-title.title-huge {
      font-size: 5.5rem;
    }
    
    .slide-title.gradient-text {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .slide-subtitle {
      font-size: 1.5rem;
      color: var(--text-muted);
      line-height: 1.6;
      max-width: 700px;
    }
    
    .slide-content {
      font-size: 1.25rem;
      line-height: 1.8;
      color: var(--text);
      margin-bottom: 24px;
    }
    
    /* GAMMA-STYLE: Bullet Points */
    .bullet-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    
    .bullet-number {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
      box-shadow: 0 4px 15px rgba(${hexToRgb(theme.primaryColor)}, 0.3);
    }
    
    .bullet-text {
      font-size: 1.125rem;
      line-height: 1.6;
      color: var(--text);
      padding-top: 4px;
    }
    
    /* GAMMA-STYLE: Images */
    .image-frame {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(${hexToRgb(theme.primaryColor)}, 0.1), rgba(${hexToRgb(theme.secondaryColor)}, 0.05));
      box-shadow: 0 25px 80px rgba(${hexToRgb(theme.primaryColor)}, 0.2);
    }
    
    .image-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    .image-frame::after {
      content: '';
      position: absolute;
      top: -4px;
      right: -4px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: 0 24px 0 24px;
      opacity: 0.8;
    }
    
    /* GAMMA-STYLE: Quote */
    .quote-mark {
      font-size: 180px;
      font-family: Georgia, serif;
      color: var(--primary);
      opacity: 0.15;
      line-height: 1;
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      text-shadow: 0 0 60px rgba(${hexToRgb(theme.primaryColor)}, 0.4);
    }
    
    .quote-text {
      font-size: 2.5rem;
      font-weight: 300;
      font-style: italic;
      line-height: 1.5;
      color: var(--text);
      max-width: 900px;
      position: relative;
      z-index: 1;
    }
    
    .quote-author {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 40px;
    }
    
    .quote-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
    }
    
    .quote-author-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--primary);
    }
    
    /* GAMMA-STYLE: Stats */
    .stats-header {
      grid-column: 1 / -1;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, rgba(${hexToRgb(theme.primaryColor)}, 0.08), rgba(${hexToRgb(theme.secondaryColor)}, 0.04));
      border: 1px solid rgba(${hexToRgb(theme.primaryColor)}, 0.1);
      border-radius: 24px;
      padding: 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .stat-card:hover {
      transform: scale(1.05);
      box-shadow: 0 20px 60px rgba(${hexToRgb(theme.primaryColor)}, 0.2);
    }
    
    .stat-value {
      font-size: 4rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
      filter: drop-shadow(0 4px 20px rgba(${hexToRgb(theme.primaryColor)}, 0.4));
    }
    
    .stat-label {
      font-size: 1rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .stat-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 4px;
      border-radius: 4px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      opacity: 0.6;
    }
    
    /* GAMMA-STYLE: Thank You */
    .thank-you-icon {
      width: 120px;
      height: 120px;
      border-radius: 32px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      margin-bottom: 40px;
      box-shadow: 0 20px 60px rgba(${hexToRgb(theme.primaryColor)}, 0.4);
      animation: float 3s ease-in-out infinite;
    }
    
    .social-buttons {
      display: flex;
      gap: 16px;
      margin-top: 40px;
    }
    
    .social-btn {
      padding: 12px 24px;
      border-radius: 100px;
      background: linear-gradient(135deg, rgba(${hexToRgb(theme.primaryColor)}, 0.1), rgba(${hexToRgb(theme.secondaryColor)}, 0.05));
      border: 1px solid rgba(${hexToRgb(theme.primaryColor)}, 0.15);
      color: var(--primary);
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    /* Full Image */
    .full-image-bg {
      position: absolute;
      inset: 0;
      object-fit: cover;
    }
    
    .full-image-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%);
    }
    
    .full-image-content {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 60px;
      z-index: 1;
    }
    
    .full-image-content .slide-title {
      color: white;
      text-shadow: 0 4px 30px rgba(0,0,0,0.5);
    }
    
    .full-image-content .slide-content {
      color: rgba(255,255,255,0.9);
    }
    
    /* Navigation */
    .nav { 
      position: fixed; 
      bottom: 30px; 
      left: 50%; 
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      z-index: 100;
    }
    
    .nav button { 
      padding: 14px 28px; 
      border: none; 
      background: var(--surface); 
      color: var(--text); 
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .nav button:hover { 
      background: var(--primary); 
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(${hexToRgb(theme.primaryColor)}, 0.3);
    }
    
    .slide-counter {
      position: fixed;
      bottom: 35px;
      right: 30px;
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
      transition: width 0.3s ease;
      z-index: 1000;
    }
    
    /* Fullscreen mode */
    .fullscreen-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px;
      border: none;
      background: var(--surface);
      color: var(--text);
      border-radius: 10px;
      cursor: pointer;
      z-index: 100;
      transition: all 0.2s ease;
    }
    
    .fullscreen-btn:hover {
      background: var(--primary);
      color: white;
    }
    
    @media print {
      .slide { page-break-after: always; display: flex !important; position: relative; height: 100vh; }
      .nav, .slide-counter, .fullscreen-btn, .progress-bar { display: none; }
      .bg-orb { display: none; }
    }
  </style>
</head>
<body>
  <div class="progress-bar" id="progress"></div>
  
  <div class="presentation">
    ${slidesHTML}
  </div>
  
  <div class="nav">
    <button onclick="prevSlide()">← Назад</button>
    <button onclick="nextSlide()">Вперёд →</button>
  </div>
  
  <div class="slide-counter">
    <span id="current">1</span> / <span id="total">${presentation.slides.length}</span>
  </div>
  
  <button class="fullscreen-btn" onclick="toggleFullscreen()" title="Полноэкранный режим">
    ⛶
  </button>
  
  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const total = slides.length;
    
    function updateProgress() {
      const progress = ((currentSlide + 1) / total) * 100;
      document.getElementById('progress').style.width = progress + '%';
    }
    
    function showSlide(index) {
      slides.forEach((s, i) => {
        s.classList.remove('active');
        if (i === index) {
          setTimeout(() => s.classList.add('active'), 50);
        }
      });
      document.getElementById('current').textContent = index + 1;
      updateProgress();
    }
    
    function nextSlide() {
      if (currentSlide < total - 1) {
        currentSlide++;
        showSlide(currentSlide);
      }
    }
    
    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        showSlide(currentSlide);
      }
    }
    
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
      if (e.key === 'Home') {
        currentSlide = 0;
        showSlide(0);
      }
      if (e.key === 'End') {
        currentSlide = total - 1;
        showSlide(currentSlide);
      }
    });
    
    // Touch support
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });
    
    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextSlide();
        else prevSlide();
      }
    });
    
    showSlide(0);
    updateProgress();
  </script>
</body>
</html>`;
}
