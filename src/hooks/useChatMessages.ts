// src/hooks/useChatMessages.ts - AVEC SUPPORT DM
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

const MESSAGES_PER_PAGE = 50;

export function useChatMessages(
  channelIdOrUserId: string, 
  companyId: string,
  currentUserId?: string,
  isDM: boolean = false
  
) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Déterminer le type : 'general', 'channel', ou 'dm'
  const getMessageType = () => {
    if (channelIdOrUserId === 'general') return 'general';
    // Si c'est un UUID (longueur 36 avec tirets), c'est soit un canal soit un DM
    // On vérifie la route pour savoir
    if (channelIdOrUserId.length === 36) {
      // Si on est sur /chat/dm/:userId → c'est un DM
      if (window.location.pathname.includes('/dm/')) {
        return 'dm';
      }
      // Sinon c'est un canal
      return 'channel';
    }
    return 'general';
  };

  const messageType = getMessageType();

  const loadMessages = useCallback(async (loadOffset = 0) => {
    if (!companyId) return;

    try {
      console.log("📬 Chargement messages:", { messageType, channelIdOrUserId, currentUserId });

      let query = supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .range(loadOffset, loadOffset + MESSAGES_PER_PAGE - 1);

      if (messageType === 'channel') {
        // Messages d'un canal spécifique
        query = query.eq("channel_id", channelIdOrUserId);
        console.log("  → Type: Canal", channelIdOrUserId);
      } else if (messageType === 'dm') {
        // Messages directs entre deux utilisateurs
        if (!currentUserId) {
          console.error("❌ currentUserId manquant pour DM");
          return;
        }
        
        query = query
          .eq("company_id", companyId)
          .is("channel_id", null)
          .or(`and(user_id.eq.${currentUserId},receiver_id.eq.${channelIdOrUserId}),and(user_id.eq.${channelIdOrUserId},receiver_id.eq.${currentUserId})`);
        
        console.log("  → Type: DM entre", currentUserId, "et", channelIdOrUserId);
      } else {
        // Messages généraux de l'entreprise (sans canal, sans receiver_id)
        query = query
          .eq("company_id", companyId)
          .is("channel_id", null)
          .is("receiver_id", null);
        console.log("  → Type: Chat général");
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log("✅ Messages chargés:", data?.length || 0);

      if (data) {
        if (loadOffset === 0) {
          setMessages(data);
        } else {
          setMessages((prev) => [...data, ...prev]);
        }
        setHasMore(data.length === MESSAGES_PER_PAGE);
      }
    } catch (error) {
      console.error("❌ Erreur chargement messages:", error);
    } finally {
      setLoading(false);
    }
  }, [channelIdOrUserId, companyId, currentUserId, messageType]);

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
    let filter = '';
    
    if (messageType === 'channel') {
      filter = `channel_id=eq.${channelIdOrUserId}`;
    } else if (messageType === 'dm' && currentUserId) {
      // Pour les DM, écouter les messages entre les deux users
      filter = `company_id=eq.${companyId}`;
    } else {
      filter = `company_id=eq.${companyId}`;
    }

    const channel = supabase
      .channel(`messages:${messageType}:${channelIdOrUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter,
        },
        (payload) => {
          console.log("🔔 Message temps réel:", payload.eventType, payload);

          // Filtrer côté client pour les DM
          if (messageType === 'dm' && currentUserId) {
            const message = payload.new as any;
            const isRelevant = 
              (message?.user_id === currentUserId && message?.receiver_id === channelIdOrUserId) ||
              (message?.user_id === channelIdOrUserId && message?.receiver_id === currentUserId);
            
            if (!isRelevant) {
              console.log("  → Message non pertinent pour ce DM, ignoré");
              return;
            }
          }

          if (payload.eventType === "INSERT") {
            setMessages((prev) => {
              // Éviter les doublons
              const newMessage = payload.new as any;
              if (prev.find((m) => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === (payload.new as any).id ? payload.new as any : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelIdOrUserId, companyId, currentUserId, messageType, loadMessages]);

  return { messages, loading, hasMore, loadMore };
}