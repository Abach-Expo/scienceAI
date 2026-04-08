/**
 * localStorage Size Manager
 * Monitors and auto-cleans localStorage to prevent quota overflow.
 */

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB safety limit (browser max ~5-10MB)
const WARNING_THRESHOLD = 0.8; // Warn at 80%

/** Estimate total localStorage size in bytes */
export function getLocalStorageSizeBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += key.length * 2; // UTF-16
      total += (localStorage.getItem(key)?.length || 0) * 2;
    }
  }
  return total;
}

/** Get size breakdown by key */
export function getStorageSizeBreakdown(): Array<{ key: string; sizeKB: number }> {
  const items: Array<{ key: string; sizeKB: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const size = ((key.length + (localStorage.getItem(key)?.length || 0)) * 2) / 1024;
      items.push({ key, sizeKB: Math.round(size * 10) / 10 });
    }
  }
  return items.sort((a, b) => b.sizeKB - a.sizeKB);
}

/** Keys that can be trimmed (ordered by priority — trim first → last) */
const TRIMMABLE_KEYS = [
  'notifications',
  'dashboard_items',
  'ai_requests_count',
  'activity_streak',
  'achievements',
];

/** Keys holding array data that can be truncated to keep only recent items */
const TRUNCATABLE_ARRAY_KEYS = [
  { key: 'chats', maxItems: 50, label: 'chats' },
  { key: 'science-ai-presentations', maxItems: 30, label: 'presentations' },
  { key: 'academic-documents', maxItems: 30, label: 'academic docs' },
  { key: 'dissertations', maxItems: 20, label: 'dissertations' },
];

/**
 * Clean up localStorage if nearing quota.
 * Returns true if cleanup was performed.
 */
export function cleanupLocalStorage(): boolean {
  const currentSize = getLocalStorageSizeBytes();
  if (currentSize < MAX_SIZE_BYTES * WARNING_THRESHOLD) return false;

  let cleaned = false;

  // Step 1: Remove non-essential keys
  for (const key of TRIMMABLE_KEYS) {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      cleaned = true;
    }
  }

  // Step 2: Remove chat draft keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('chat-draft-') || key?.startsWith('chat-feedback-')) {
      localStorage.removeItem(key);
      cleaned = true;
    }
  }

  // Step 3: Truncate large array collections (keep newest)
  if (getLocalStorageSizeBytes() > MAX_SIZE_BYTES * 0.7) {
    for (const { key, maxItems } of TRUNCATABLE_ARRAY_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > maxItems) {
          // Keep the last N items (assuming newest are appended at the end)
          const trimmed = arr.slice(-maxItems);
          localStorage.setItem(key, JSON.stringify(trimmed));
          cleaned = true;
        }
      } catch { /* skip corrupt data */ }
    }
  }

  return cleaned;
}

/**
 * Safe wrapper for localStorage.setItem that cleans up before throwing QuotaExceeded
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      cleanupLocalStorage();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        console.warn(`[Storage] Failed to save '${key}' even after cleanup`);
        return false;
      }
    }
    throw e;
  }
}

/**
 * Initialize storage monitoring — call once on app start.
 * Runs cleanup if storage is near capacity.
 */
export function initStorageManager(): void {
  cleanupLocalStorage();
}
