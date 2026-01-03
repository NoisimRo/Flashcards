import type { Deck, Card, User, StudySession, SyncQueueItem } from '../types';

const DB_NAME = 'flashcards_offline';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

// ============================================
// DATABASE INITIALIZATION
// ============================================

export async function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = event => {
      const database = (event.target as IDBOpenDBRequest).result;

      // User store
      if (!database.objectStoreNames.contains('user')) {
        database.createObjectStore('user', { keyPath: 'id' });
      }

      // Decks store
      if (!database.objectStoreNames.contains('decks')) {
        const decksStore = database.createObjectStore('decks', { keyPath: 'id' });
        decksStore.createIndex('ownerId', 'ownerId', { unique: false });
        decksStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Cards store
      if (!database.objectStoreNames.contains('cards')) {
        const cardsStore = database.createObjectStore('cards', { keyPath: 'id' });
        cardsStore.createIndex('deckId', 'deckId', { unique: false });
      }

      // Study sessions store
      if (!database.objectStoreNames.contains('sessions')) {
        const sessionsStore = database.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('deckId', 'deckId', { unique: false });
        sessionsStore.createIndex('status', 'status', { unique: false });
      }

      // Sync queue store
      if (!database.objectStoreNames.contains('syncQueue')) {
        const syncStore = database.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('entityType', 'entityType', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Cache metadata store
      if (!database.objectStoreNames.contains('metadata')) {
        database.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
}

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

async function getStore(
  storeName: string,
  mode: IDBTransactionMode = 'readonly'
): Promise<IDBObjectStore> {
  const database = await initDatabase();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | null> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, item: T): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function remove(storeName: string, id: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clear(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// USER OPERATIONS
// ============================================

export async function saveUser(user: User): Promise<void> {
  await put('user', user);
}

export async function getUser(): Promise<User | null> {
  const users = await getAll<User>('user');
  return users[0] || null;
}

export async function clearUser(): Promise<void> {
  await clear('user');
}

// ============================================
// DECK OPERATIONS
// ============================================

export async function saveDecks(decks: Deck[]): Promise<void> {
  for (const deck of decks) {
    await put('decks', deck);
  }
}

export async function saveDeck(deck: Deck): Promise<void> {
  await put('decks', deck);
}

export async function getDecks(): Promise<Deck[]> {
  return getAll<Deck>('decks');
}

export async function getDeck(id: string): Promise<Deck | null> {
  return getById<Deck>('decks', id);
}

export async function deleteDeck(id: string): Promise<void> {
  await remove('decks', id);
  // Also delete all cards for this deck
  const cards = await getCardsByDeck(id);
  for (const card of cards) {
    await remove('cards', card.id);
  }
}

// ============================================
// CARD OPERATIONS
// ============================================

export async function saveCards(cards: Card[]): Promise<void> {
  for (const card of cards) {
    await put('cards', card);
  }
}

export async function saveCard(card: Card): Promise<void> {
  await put('cards', card);
}

export async function getCardsByDeck(deckId: string): Promise<Card[]> {
  const store = await getStore('cards');
  const index = store.index('deckId');
  return new Promise((resolve, reject) => {
    const request = index.getAll(deckId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCard(id: string): Promise<void> {
  await remove('cards', id);
}

// ============================================
// SESSION OPERATIONS
// ============================================

export async function saveSession(session: StudySession): Promise<void> {
  await put('sessions', session);
}

export async function getActiveSession(deckId: string): Promise<StudySession | null> {
  const store = await getStore('sessions');
  const index = store.index('deckId');
  return new Promise((resolve, reject) => {
    const request = index.getAll(deckId);
    request.onsuccess = () => {
      const sessions = request.result.filter((s: StudySession) => s.status === 'active');
      resolve(sessions[0] || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  await remove('sessions', id);
}

// ============================================
// SYNC QUEUE OPERATIONS
// ============================================

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  const store = await getStore('syncQueue', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.add({
      ...item,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAll<SyncQueueItem>('syncQueue');
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await remove('syncQueue', id);
}

export async function clearSyncQueue(): Promise<void> {
  await clear('syncQueue');
}

// ============================================
// METADATA OPERATIONS
// ============================================

export async function setMetadata(key: string, value: any): Promise<void> {
  await put('metadata', { key, value, updatedAt: new Date().toISOString() });
}

export async function getMetadata(key: string): Promise<any> {
  const item = await getById<{ key: string; value: any }>('metadata', key);
  return item?.value || null;
}

// ============================================
// SYNC HELPERS
// ============================================

export async function getLastSyncTime(): Promise<string | null> {
  return getMetadata('lastSyncTime');
}

export async function setLastSyncTime(time: string): Promise<void> {
  await setMetadata('lastSyncTime', time);
}

export async function getPendingChangesCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}

// ============================================
// FULL DATA OPERATIONS
// ============================================

export async function clearAllData(): Promise<void> {
  await clear('user');
  await clear('decks');
  await clear('cards');
  await clear('sessions');
  await clear('syncQueue');
  await clear('metadata');
}

export async function exportAllData(): Promise<{
  user: User | null;
  decks: Deck[];
  cards: Card[];
  sessions: StudySession[];
  syncQueue: SyncQueueItem[];
}> {
  return {
    user: await getUser(),
    decks: await getDecks(),
    cards: await getAll<Card>('cards'),
    sessions: await getAll<StudySession>('sessions'),
    syncQueue: await getSyncQueue(),
  };
}

// Initialize on import
initDatabase().catch(console.error);
