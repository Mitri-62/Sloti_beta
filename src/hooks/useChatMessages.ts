// src/hooks/useChatMessages.ts - VERSION AMÉLIORÉE AVEC OPTIMISTIC UI
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  content: string;
  user_id: string;
  username: string;
  company_id: string;
  channel_id: string | null;
  receiver_id: string | null;
  attachment_url?: string;
  attachment_type?: string;
  reactions?: Array<{ emoji: string; users: string[] }>;
  edited?: boolean;
  created_at: string;
  isOptimistic?: boolean;
}

interface UseChatMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  addOptimisticMessage: (message: Message) => void;
  removeOptimisticMessage: (tempId: string) => void;
  refresh: () => Promise<void>;
}

const PAGE_SIZE = 50;

export function useChatMessages(
  conversationId: string,
  companyId: string,
  currentUserId?: string,
  isDM: boolean = false
): UseChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isLoadingMore = useRef(false);

  // Combiner messages réels + optimistes
  const combinedMessages = [...messages, ...optimisticMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Ajouter un message optimiste
  const addOptimisticMessage = useCallback((message: Message) => {
    setOptimisticMessages(prev => [...prev, { ...message, isOptimistic: true }]);
  }, []);

  // Retirer un message optimiste (après confirmation serveur ou erreur)
  const removeOptimisticMessage = useCallback((tempId: string) => {
    setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
  }, []);

  // Charger les messages
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!companyId) return;
    
    if (loadMore && isLoadingMore.current) return;
    if (loadMore) isLoadingMore.current = true;

    try {
      if (!loadMore) setLoading(true);
      
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(loadMore ? offset : 0, loadMore ? offset + PAGE_SIZE - 1 : PAGE_SIZE - 1);

      // Filtrer selon le type de conversation
      if (isDM && currentUserId) {
        // Messages privés : entre l'utilisateur courant et l'autre utilisateur
        query = query.or(
          `and(user_id.eq.${currentUserId},receiver_id.eq.${conversationId}),and(user_id.eq.${conversationId},receiver_id.eq.${currentUserId})`
        );
      } else if (conversationId && conversationId !== 'general') {
        // Canal spécifique
        query = query.eq('channel_id', conversationId);
      } else {
        // Chat général : pas de channel_id et pas de receiver_id
        query = query.is('channel_id', null).is('receiver_id', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const reversedData = (data || []).reverse();

      if (loadMore) {
        setMessages(prev => [...reversedData, ...prev]);
        setOffset(prev => prev + PAGE_SIZE);
      } else {
        setMessages(reversedData);
        setOffset(PAGE_SIZE);
      }

      setHasMore((data?.length || 0) === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      console.error('Erreur chargement messages:', err);
      setError(err.message || 'Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  }, [companyId, conversationId, currentUserId, isDM, offset]);

  // Charger plus de messages
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchMessages(true);
  }, [fetchMessages, hasMore, loading]);

  // Rafraîchir les messages
  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await fetchMessages(false);
  }, [fetchMessages]);

  // Chargement initial
  useEffect(() => {
    setMessages([]);
    setOptimisticMessages([]);
    setOffset(0);
    setHasMore(true);
    fetchMessages(false);
  }, [conversationId, companyId, currentUserId, isDM]);

  // Abonnement realtime
  useEffect(() => {
    if (!companyId) return;

    // Nettoyer l'ancien canal
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = isDM 
      ? `dm-${[currentUserId, conversationId].sort().join('-')}`
      : `chat-${conversationId}-${companyId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // Vérifier si le message appartient à cette conversation
          const belongsToConversation = (msg: any) => {
            if (isDM && currentUserId) {
              return (
                (msg.user_id === currentUserId && msg.receiver_id === conversationId) ||
                (msg.user_id === conversationId && msg.receiver_id === currentUserId)
              );
            } else if (conversationId && conversationId !== 'general') {
              return msg.channel_id === conversationId;
            } else {
              return !msg.channel_id && !msg.receiver_id;
            }
          };

          switch (eventType) {
            case 'INSERT':
              if (belongsToConversation(newRecord)) {
                setMessages(prev => {
                  // Éviter les doublons
                  if (prev.some(m => m.id === newRecord.id)) return prev;
                  return [...prev, newRecord as Message];
                });
                // Retirer le message optimiste correspondant si présent
                setOptimisticMessages(prev => 
                  prev.filter(m => 
                    m.content !== newRecord.content || 
                    m.user_id !== newRecord.user_id
                  )
                );
              }
              break;

            case 'UPDATE':
              setMessages(prev =>
                prev.map(m => (m.id === newRecord.id ? (newRecord as Message) : m))
              );
              break;

            case 'DELETE':
              setMessages(prev => prev.filter(m => m.id !== oldRecord.id));
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [companyId, conversationId, currentUserId, isDM]);

  return {
    messages: combinedMessages,
    loading,
    error,
    hasMore,
    loadMore,
    addOptimisticMessage,
    removeOptimisticMessage,
    refresh,
  };
}