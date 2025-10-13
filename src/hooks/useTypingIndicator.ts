// src/hooks/useTypingIndicator.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export function useTypingIndicator(channelId: string, username: string) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.company_id) return;

    // Canal unique par company ET channel
    const channel = supabase.channel(`typing:${user.company_id}:${channelId}`);

    // Recevoir les événements de frappe
    channel
      .on("broadcast", { event: "typing" }, (payload: any) => {
        // CRITIQUE: Vérifier que l'événement vient de la même company
        if (payload.payload.company_id !== user.company_id) {
          return; // Ignorer les événements des autres companies
        }

        const { username: typingUsername, user_id } = payload.payload;

        // Ne pas afficher si c'est notre propre frappe
        if (user_id === user.id) return;

        setTypingUsers((prev) => {
          if (!prev.includes(typingUsername)) {
            return [...prev, typingUsername];
          }
          return prev;
        });

        // Retirer après 3 secondes
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== typingUsername));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, user?.company_id, user?.id]);

  const notifyTyping = (username: string) => {
    if (!user?.company_id) return;

    const channel = supabase.channel(`typing:${user.company_id}:${channelId}`);
    
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { 
            username, 
            user_id: user.id,
            company_id: user.company_id // CRITIQUE: Inclure company_id
          },
        });
      }
    });

    // Nettoyer après l'envoi
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 100);
  };

  return { typingUsers, notifyTyping };
}