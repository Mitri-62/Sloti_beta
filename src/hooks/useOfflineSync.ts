import { useEffect, useState } from 'react';
import { LocalDB } from '../db/indexedDB';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [db] = useState(() => new LocalDB());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    db.init().catch(console.error);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  useEffect(() => {
    if (isOnline) {
      syncWithServer();
    }
  }, [isOnline]);

  const syncWithServer = async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      const queue = await db.getSyncQueue();
      
      if (queue.length === 0) return;

      // Ici, nous synchroniserions avec le serveur
      // Pour chaque élément dans la queue, envoyer au serveur
      for (const item of queue) {
        try {
          // Simuler l'envoi au serveur
          console.log('Syncing:', item);
          // await api.sync(item);
        } catch (error) {
          console.error('Sync error:', error);
          return; // Stop si erreur pour garder l'ordre des opérations
        }
      }

      await db.clearSyncQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const addOfflineAction = async (action: string, data: any) => {
    await db.addToSyncQueue(action, data);
    if (isOnline) {
      syncWithServer();
    }
  };

  return {
    isOnline,
    isSyncing,
    addOfflineAction,
    syncWithServer,
    db
  };
}