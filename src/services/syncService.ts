import { api } from '../api/client';
import * as offlineStorage from './offlineStorage';
import type { Deck, Card, SyncQueueItem } from '../types';

// ============================================
// SYNC STATE
// ============================================

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingChanges: number;
  error: string | null;
}

let syncState: SyncState = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncTime: null,
  pendingChanges: 0,
  error: null,
};

const listeners: ((state: SyncState) => void)[] = [];

export function getSyncState(): SyncState {
  return { ...syncState };
}

export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

function updateSyncState(updates: Partial<SyncState>) {
  syncState = { ...syncState, ...updates };
  listeners.forEach(l => l(syncState));
}

// ============================================
// ONLINE/OFFLINE DETECTION
// ============================================

export function initOnlineDetection() {
  window.addEventListener('online', () => {
    updateSyncState({ isOnline: true });
    // Auto-sync when coming back online
    syncAll().catch(console.error);
  });

  window.addEventListener('offline', () => {
    updateSyncState({ isOnline: false });
  });

  // Initial check
  updateSyncState({ isOnline: navigator.onLine });
}

// ============================================
// QUEUE OPERATIONS FOR OFFLINE CHANGES
// ============================================

export async function queueChange(
  operation: 'create' | 'update' | 'delete',
  entityType: 'deck' | 'card' | 'session',
  entityId: string,
  data?: any
) {
  await offlineStorage.addToSyncQueue({
    operation,
    entityType,
    entityId,
    data,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });

  const count = await offlineStorage.getPendingChangesCount();
  updateSyncState({ pendingChanges: count });

  // Try to sync immediately if online
  if (navigator.onLine) {
    syncAll().catch(console.error);
  }
}

// ============================================
// DECK OPERATIONS WITH OFFLINE SUPPORT
// ============================================

export async function saveDeckOffline(deck: Deck, isNew: boolean = false) {
  // Save locally first
  await offlineStorage.saveDeck(deck);

  // Queue for sync
  await queueChange(isNew ? 'create' : 'update', 'deck', deck.id, deck);
}

export async function deleteDeckOffline(deckId: string) {
  // Mark for deletion locally
  await offlineStorage.deleteDeck(deckId);

  // Queue for sync
  await queueChange('delete', 'deck', deckId);
}

export async function saveCardOffline(card: Card, isNew: boolean = false) {
  await offlineStorage.saveCard(card);
  await queueChange(isNew ? 'create' : 'update', 'card', card.id, card);
}

export async function deleteCardOffline(cardId: string) {
  await offlineStorage.deleteCard(cardId);
  await queueChange('delete', 'card', cardId);
}

// ============================================
// SYNC LOGIC
// ============================================

export async function syncAll(): Promise<void> {
  if (!navigator.onLine) {
    console.log('Offline - skipping sync');
    return;
  }

  if (syncState.isSyncing) {
    console.log('Sync already in progress');
    return;
  }

  updateSyncState({ isSyncing: true, error: null });

  try {
    // Process sync queue
    await processSyncQueue();

    // Pull latest data from server
    await pullFromServer();

    const lastSync = new Date().toISOString();
    await offlineStorage.setLastSyncTime(lastSync);

    updateSyncState({
      isSyncing: false,
      lastSyncTime: lastSync,
      pendingChanges: 0,
    });

    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    updateSyncState({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
}

async function processSyncQueue(): Promise<void> {
  const queue = await offlineStorage.getSyncQueue();

  for (const item of queue) {
    try {
      await processQueueItem(item);
      await offlineStorage.removeSyncQueueItem(item.id);
    } catch (error) {
      console.error('Failed to process queue item:', item, error);
      // Could implement retry logic here
    }
  }
}

async function processQueueItem(item: SyncQueueItem): Promise<void> {
  switch (item.entityType) {
    case 'deck':
      await syncDeckChange(item);
      break;
    case 'card':
      await syncCardChange(item);
      break;
    case 'session':
      await syncSessionChange(item);
      break;
  }
}

async function syncDeckChange(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'create':
      await api.post('/decks', item.data);
      break;
    case 'update':
      await api.put(`/decks/${item.entityId}`, item.data);
      break;
    case 'delete':
      await api.delete(`/decks/${item.entityId}`);
      break;
  }
}

async function syncCardChange(item: SyncQueueItem): Promise<void> {
  const card = item.data as Card;
  switch (item.operation) {
    case 'create':
      await api.post(`/decks/${card.deckId}/cards`, item.data);
      break;
    case 'update':
      await api.put(`/decks/${card.deckId}/cards/${item.entityId}`, item.data);
      break;
    case 'delete':
      // Need to get deckId from somewhere - might need to store it in the queue item
      // For now, assuming card has deckId
      if (card?.deckId) {
        await api.delete(`/decks/${card.deckId}/cards/${item.entityId}`);
      }
      break;
  }
}

async function syncSessionChange(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case 'create':
      await api.post('/sessions', item.data);
      break;
    case 'update':
      await api.put(`/sessions/${item.entityId}`, item.data);
      break;
  }
}

async function pullFromServer(): Promise<void> {
  // Pull decks
  const decksResponse = await api.get<{ data: Deck[] }>('/decks');
  if (decksResponse.success && decksResponse.data) {
    // Type assertion to handle the nested structure
    const decks = Array.isArray(decksResponse.data) ? decksResponse.data : [];
    await offlineStorage.saveDecks(decks);

    // Pull cards for each deck
    for (const deck of decks) {
      const deckResponse = await api.get<{ cards: Card[] }>(`/decks/${deck.id}`);
      if (deckResponse.success && deckResponse.data) {
        const deckData = deckResponse.data as any;
        if (deckData.cards) {
          await offlineStorage.saveCards(deckData.cards);
        }
      }
    }
  }
}

// ============================================
// CONFLICT RESOLUTION
// ============================================

export type ConflictResolution = 'server' | 'local' | 'merge';

export interface SyncConflict {
  entityType: string;
  entityId: string;
  localData: any;
  serverData: any;
}

export async function resolveConflict(
  conflict: SyncConflict,
  resolution: ConflictResolution
): Promise<void> {
  switch (resolution) {
    case 'server':
      // Use server data - just pull fresh
      await pullFromServer();
      break;
    case 'local':
      // Push local changes
      await queueChange(
        'update',
        conflict.entityType as any,
        conflict.entityId,
        conflict.localData
      );
      await syncAll();
      break;
    case 'merge': {
      // Simple merge - combine non-conflicting fields
      const merged = { ...conflict.serverData, ...conflict.localData };
      await queueChange('update', conflict.entityType as any, conflict.entityId, merged);
      await syncAll();
      break;
    }
  }
}

// ============================================
// INIT
// ============================================

export async function initSync() {
  initOnlineDetection();

  // Load initial state
  const lastSync = await offlineStorage.getLastSyncTime();
  const pendingChanges = await offlineStorage.getPendingChangesCount();

  updateSyncState({
    lastSyncTime: lastSync,
    pendingChanges,
  });

  // Initial sync if online
  if (navigator.onLine) {
    syncAll().catch(console.error);
  }
}
