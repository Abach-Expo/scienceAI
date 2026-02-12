import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

// Глобальные хоткеи для приложения
export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    // Навигация
    { key: 'h', ctrl: true, description: 'На главную', action: () => navigate('/dashboard') },
    { key: 'n', ctrl: true, description: 'Новый чат', action: () => navigate('/chat/new-' + Date.now()) },
    { key: 'p', ctrl: true, shift: true, description: 'Новая презентация', action: () => navigate('/presentations') },
    { key: ',', ctrl: true, description: 'Настройки', action: () => navigate('/settings') },
    
    // Поиск
    { key: 'k', ctrl: true, description: 'Быстрый поиск', action: () => {
      const event = new CustomEvent('open-search-modal');
      window.dispatchEvent(event);
    }},
    
    // Сохранение
    { key: 's', ctrl: true, description: 'Сохранить', action: () => {
      const event = new CustomEvent('save-current');
      window.dispatchEvent(event);
    }},
    
    // Экспорт
    { key: 'e', ctrl: true, shift: true, description: 'Экспорт', action: () => {
      const event = new CustomEvent('export-current');
      window.dispatchEvent(event);
    }},
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Игнорируем, если фокус в инпуте
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      // Но некоторые шорткаты работают везде
      if (!(e.ctrlKey && (e.key === 'k' || e.key === 's'))) {
        return;
      }
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

// Компонент для отображения шорткатов
export const KeyboardShortcutsHelp = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const shortcuts = [
    { category: 'Навигация', items: [
      { keys: ['Ctrl', 'H'], description: 'На главную' },
      { keys: ['Ctrl', 'N'], description: 'Новый чат' },
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Новая презентация' },
      { keys: ['Ctrl', ','], description: 'Настройки' },
    ]},
    { category: 'Действия', items: [
      { keys: ['Ctrl', 'K'], description: 'Быстрый поиск' },
      { keys: ['Ctrl', 'S'], description: 'Сохранить' },
      { keys: ['Ctrl', 'Shift', 'E'], description: 'Экспорт' },
    ]},
    { category: 'Редактор', items: [
      { keys: ['Ctrl', 'Z'], description: 'Отменить' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Повторить' },
      { keys: ['Ctrl', 'C'], description: 'Копировать' },
      { keys: ['Ctrl', 'V'], description: 'Вставить' },
    ]},
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-bg-secondary border border-border-primary rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">Горячие клавиши</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <span className="sr-only">Закрыть</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {shortcuts.map((category, i) => (
          <div key={i} className="mb-6 last:mb-0">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
              {category.category}
            </h3>
            <div className="space-y-2">
              {category.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">{item.description}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, k) => (
                      <span key={k}>
                        <kbd className="px-2 py-1 text-xs font-medium bg-bg-tertiary border border-border-primary rounded text-text-primary">
                          {key}
                        </kbd>
                        {k < item.keys.length - 1 && (
                          <span className="text-text-muted mx-1">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6 pt-4 border-t border-border-primary">
          <p className="text-xs text-text-muted text-center">
            Нажмите <kbd className="px-1.5 py-0.5 text-xs bg-bg-tertiary border border-border-primary rounded">?</kbd> чтобы открыть эту справку
          </p>
        </div>
      </div>
    </div>
  );
};

export default useKeyboardShortcuts;
