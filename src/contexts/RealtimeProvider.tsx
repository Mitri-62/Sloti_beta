// src/contexts/RealtimeProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type RealtimeEvent = {
  schema: string;
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: any;
  old: any;
};

interface RealtimeContextType {
  events: RealtimeEvent[];
}

const RealtimeContext = createContext<RealtimeContextType>({ events: [] });

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    let channel = supabase
      .channel("global-realtime")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload: any) => {
        console.log("📡 Event Realtime reçu:", payload);
        setEvents((prev) => [...prev, payload]);
      })
      .subscribe((status) => {
        console.log("🔌 Canal global status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ events }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}