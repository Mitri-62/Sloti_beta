// src/hooks/useRealtimeTable.ts
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useRealtime } from "./contexts/RealtimeProvider";

export function useRealtimeTable<T = any>(
  table: string,
  orderBy: string = "created_at"
) {
  const { events } = useRealtime();
  const [data, setData] = useState<T[]>([]);

  // Charger l'historique au montage
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order(orderBy, { ascending: true });

      if (!error && data) {
        setData(data as T[]);
      }
    };
    load();
  }, [table, orderBy]);

  // Réagir aux événements realtime
  useEffect(() => {
    if (!events.length) return;

    const lastEvent = events[events.length - 1];
    if (lastEvent.table !== table) return;

    console.log(`📡 Nouvel event pour ${table}:`, lastEvent);

    if (lastEvent.eventType === "INSERT") {
      setData((prev) => [...prev, lastEvent.new]);
    }
    if (lastEvent.eventType === "UPDATE") {
      setData((prev) =>
        prev.map((row: any) =>
          row.id === lastEvent.new.id ? { ...row, ...lastEvent.new } : row
        )
      );
    }
    if (lastEvent.eventType === "DELETE") {
      setData((prev) => prev.filter((row: any) => row.id !== lastEvent.old.id));
    }
  }, [events, table]);

  return data;
}
