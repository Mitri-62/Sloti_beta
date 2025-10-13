// src/hooks/useChatMessages.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

const MESSAGES_PER_PAGE = 50;

export function useChatMessages(channelIdOrUserId: string, companyId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Déterminer si c'est un canal ou un DM
  const isChannel = channelIdOrUserId !== 'general' && channelIdOrUserId.length > 20;

  const loadMessages = useCallback(async (loadOffset = 0) => {
    if (!companyId) return;

    try {
      let query = supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .range(loadOffset, loadOffset + MESSAGES_PER_PAGE - 1);

      if (isChannel) {
        // Messages d'un canal spécifique
        query = query.eq("channel_id", channelIdOrUserId);
      } else {
        // Messages généraux de l'entreprise (sans canal)
        query = query.eq("company_id", companyId).is("channel_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        if (loadOffset === 0) {
          setMessages(data);
        } else {
          setMessages((prev) => [...data, ...prev]);
        }
        setHasMore(data.length === MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error("Erreur chargement messages:", error);
    } finally {
      setLoading(false);
    }
  }, [channelIdOrUserId, companyId, isChannel]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const newOffset = offset + MESSAGES_PER_PAGE;
    setOffset(newOffset);
    loadMessages(newOffset);
  }, [hasMore, loading, offset, loadMessages]);

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setLoading(true);
    loadMessages(0);

    // Subscription en temps réel
    const channel = supabase
      .channel(`messages:${channelIdOrUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: isChannel 
            ? `channel_id=eq.${channelIdOrUserId}`
            : `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => {
              // Éviter les doublons
              if (prev.find((m) => m.id === payload.new.id)) {
                return prev;
              }
              return [...prev, payload.new];
            });
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelIdOrUserId, companyId, isChannel, loadMessages]);

  return { messages, loading, hasMore, loadMore };
}