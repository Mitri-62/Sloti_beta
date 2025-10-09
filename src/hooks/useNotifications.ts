// src/hooks/useNotifications.ts - VERSION CORRIGÉE
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY_PREFIX = 'notifications_read_';
const SYNC_EVENT = 'notifications_sync';

// ✅ Interface pour les notifications
interface Notification {
  id: string;
  type: 'message' | 'activity';
  content?: string;
  message?: string;
  username?: string;
  user_id?: string;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Charger les notifications lues depuis localStorage
  const loadReadNotifications = useCallback((): Set<string> => {
    if (!user?.id) return new Set();
    
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${user.id}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  }, [user?.id]);

  useEffect(() => {
    setReadNotifications(loadReadNotifications());
  }, [loadReadNotifications]);

  // Écouter les changements dans localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${STORAGE_KEY_PREFIX}${user?.id}`) {
        setReadNotifications(loadReadNotifications());
      }
    };

    const handleCustomSync = () => {
      setReadNotifications(loadReadNotifications());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(SYNC_EVENT, handleCustomSync);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(SYNC_EVENT, handleCustomSync);
    };
  }, [user?.id, loadReadNotifications]);

  // Charger les notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.company_id) return;

    setLoading(true);
    try {
      // Messages
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("id, user_id, username, content, created_at")
        .eq("company_id", user.company_id)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Activités
      const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .eq("company_id", user.company_id)
        .order("created_at", { ascending: false })
        .limit(30);

      const all: Notification[] = [
        ...(messages?.map(m => ({ ...m, type: 'message' as const })) || []),
        ...(activities?.map(a => ({ ...a, type: 'activity' as const })) || [])
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllNotifications(all);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, user?.id]);

  useEffect(() => {
    loadNotifications();

    // Realtime
    const messagesChannel = supabase
      .channel("notifications_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        loadNotifications
      )
      .subscribe();

    const activitiesChannel = supabase
      .channel("notifications_activities")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities" },
        loadNotifications
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [loadNotifications]);

  // Marquer comme lu
  const markAsRead = useCallback((notifId: string) => {
    if (!user?.id) return;

    const newRead = new Set(readNotifications);
    newRead.add(notifId);
    setReadNotifications(newRead);
    
    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(newRead)));
    
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, [user?.id, readNotifications]);

  // Marquer tout comme lu
  const markAllAsRead = useCallback(() => {
    if (!user?.id) return;

    const allIds = new Set(allNotifications.map(n => n.id));
    setReadNotifications(allIds);
    
    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(allIds)));
    
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, [user?.id, allNotifications]);

  const unreadNotifications = allNotifications.filter(n => !readNotifications.has(n.id));
  const unreadCount = unreadNotifications.length;

  return {
    allNotifications,
    unreadNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    reload: loadNotifications
  };
}