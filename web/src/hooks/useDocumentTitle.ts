import { useEffect } from 'react';

const BASE_TITLE = 'Science AI';

/**
 * Sets document.title for SEO and accessibility.
 * @param title — Page-specific title (will be appended after base title)
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
