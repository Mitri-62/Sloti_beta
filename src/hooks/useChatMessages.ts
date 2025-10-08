import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

const PAGE_SIZE = 50;

export function useChatMessages(userId: string | undefined, companyId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Charger les messages avec pagination
  const loadMessages = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      // Filtre pour conversations privées
      if (userId) {
        query = query.or(`and(user_id.eq.${userId},receiver_id.eq.${supabase.auth.getUser().then(r => r.data.user?.id)}),and(user_id.eq.${supabase.auth.getUser().then(r => r.data.user?.id)},receiver_id.eq.${userId})`);
      } else {
        query = query.is('receiver_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMessages(prev => 
        pageNum === 0 
          ? data.reverse() 
          : [...data.reverse(), ...prev]
      );
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, companyId]);

  // Charger plus de messages (scroll vers le haut)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMessages(page + 1);
    }
  }, [loading, hasMore, page, loadMessages]);

  // Temps réel
  useEffect(() => {
    loadMessages(0);

    const channel: RealtimeChannel = supabase
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev =>
              prev.map(m => (m.id === payload.new.id ? payload.new : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [companyId, loadMessages]);

  return { messages, loading, hasMore, loadMore };
}