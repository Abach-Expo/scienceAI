import { useEffect, useRef, ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  restoreFocus?: boolean;
  className?: string;
}

/**
 * FocusTrap — traps keyboard focus inside a container (for modals, drawers, dialogs).
 * Pressing Tab/Shift+Tab cycles focus within the trap.
 * On mount: focuses the first focusable element.
 * On unmount: restores focus to the previously focused element.
 */
const FocusTrap = ({ children, active = true, restoreFocus = true, className }: FocusTrapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Save the element that was focused before the trap was activated
    previouslyFocused.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'a[href]:not([disabled]):not([tabindex="-1"])',
        'button:not([disabled]):not([tabindex="-1"])',
        'textarea:not([disabled]):not([tabindex="-1"])',
        'input:not([disabled]):not([tabindex="-1"])',
        'select:not([disabled]):not([tabindex="-1"])',
        '[tabindex]:not([tabindex="-1"]):not([disabled])',
        '[contenteditable]:not([disabled])',
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(selectors))
        .filter(el => {
          // Filter out elements that are not visible
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
    };

    // Focus the first focusable element (or the container itself)
    const focusFirst = () => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    };

    // Small delay to let the DOM settle (e.g., after animation)
    const timer = setTimeout(focusFirst, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab — if focus is on the first element, move to the last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab — if focus is on the last element, move to the first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (restoreFocus && previouslyFocused.current && previouslyFocused.current.focus) {
        try {
          previouslyFocused.current.focus();
        } catch {
          // Element may have been removed from DOM
        }
      }
    };
  }, [active, restoreFocus]);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} tabIndex={-1} className={className} style={{ outline: 'none' }}>
      {children}
    </div>
  );
};

export default FocusTrap;
