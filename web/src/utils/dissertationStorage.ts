/**
 * IndexedDB storage for dissertations.
 * Replaces localStorage to avoid 5MB quota limits.
 * One dissertation (100 pages) ≈ 300-500KB → localStorage overflows after 10-15 works.
 * IndexedDB has no practical size limit.
 */
import type { Dissertation } from '../pages/dissertation';

const DB_NAME = 'science-ai-db';
const DB_VERSION = 1;
const STORE_NAME = 'dissertations';

let dbPromise: Promise<IDBDatabase> | null = null;
let dbReady = false;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise && dbReady) return dbPromise;
  if (dbPromise) return dbPromise; // Already initializing — reuse same promise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbReady = true;
      resolve(request.result);
    };
    request.onerror = () => {
      dbPromise = null;
      dbReady = false;
      reject(request.error);
    };
  });
  return dbPromise;
}

export async function getAllDissertations(): Promise<Dissertation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getDissertation(id: string): Promise<Dissertation | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDissertationToDB(diss: Dissertation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(diss);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteDissertationFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateDissertationField(id: string, field: string, value: unknown): Promise<void> {
  const diss = await getDissertation(id);
  if (!diss) return;
  (diss as unknown as Record<string, unknown>)[field] = value;
  await saveDissertationToDB(diss);
}

/**
 * One-time migration: moves existing dissertations from localStorage to IndexedDB.
 * Runs on every app start; no-ops if localStorage is empty.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    const saved = localStorage.getItem('dissertations');
    if (!saved) return;
    const list: Dissertation[] = JSON.parse(saved);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.removeItem('dissertations');
      return;
    }

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const diss of list) {
      store.put(diss);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    localStorage.removeItem('dissertations');
  } catch (e) {
    // Migration failed — localStorage data stays as fallback for next attempt
    if (process.env.NODE_ENV !== 'production') {
      console.error('IndexedDB migration failed:', e);
    }
  }
}
