import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useTypingIndicator(channelId: string, userId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`typing_${channelId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state)
          .flat()
          .map((s: any) => s.username)
          .filter((u: string) => u !== userId);
        setTypingUsers(users);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [channelId, userId]);

  const notifyTyping = (username: string) => {
    const channel = supabase.channel(`typing_${channelId}`);
    channel.track({ username, typing: true });
    
    setTimeout(() => {
      channel.untrack();
    }, 3000);
  };

  return { typingUsers, notifyTyping };
}