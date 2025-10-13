// src/components/PlanningKanban.tsx - AVEC DARK MODE
import { Planning } from "../hooks/usePlannings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string, updates: Partial<Planning>) => void;
}

function DraggableCard({ 
  ev, 
  onDelete 
}: { 
  ev: Planning; 
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ev.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const parseDateTime = (date: string, hour: string) => {
    const [year, month, day] = date.split('-').map(Number);
    const [h, m] = (hour || "00:00").split(':').map(Number);
    return new Date(year, month - 1, day, h, m);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-2 border border-gray-200 dark:border-gray-700 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'
      }`}
    >
      <p className="font-medium text-sm mb-1 text-gray-900 dark:text-white">
        {format(parseDateTime(ev.date, ev.hour), "EEE dd/MM/yyyy à HH:mm", { locale: fr })}
      </p>

      <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium mb-2 ${
        ev.type === "Réception" 
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
          : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
      }`}>
        {ev.type}
      </span>

      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        {ev.transporter}
      </p>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {ev.products}
      </p>

      {ev.documents && ev.documents.length > 0 && (
        <div className="mt-2">
          <span className="text-xs bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 px-2 py-1 rounded">
            Docs ({ev.documents.length})
          </span>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(ev.id!);
          }}
          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

function DroppableColumn({ 
  status, 
  children,
  count,
  statusColors
}: { 
  status: string; 
  children: React.ReactNode;
  count: number;
  statusColors: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow min-h-[500px] transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-300 dark:ring-blue-600' : ''
      }`}
    >
      <div className={`font-semibold mb-3 px-3 py-2 rounded-lg border ${statusColors[status]} flex justify-between items-center`}>
        <span>{status}</span>
        <span className="text-xs font-normal opacity-75 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function PlanningKanban({ events, onDelete, onValidate }: Props) {
  const statuses = ["Prévu", "Terminé"] as const;
  const [activeId, setActiveId] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    "Prévu": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
    "Terminé": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
  };

  // Filtrer uniquement Prévu et Terminé
  const filteredEvents = useMemo(() => {
    return events.filter(ev => ev.status === "Prévu" || ev.status === "Terminé");
  }, [events]);

  const grouped = useMemo(() => {
    const result = filteredEvents.reduce<Record<string, Planning[]>>((acc, ev) => {
      if (!ev.id) return acc;
      acc[ev.status] = acc[ev.status] || [];
      acc[ev.status].push(ev);
      return acc;
    }, {});

    Object.keys(result).forEach((status) => {
      result[status].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.hour || "00:00"}`).getTime();
        const dateB = new Date(`${b.date}T${b.hour || "00:00"}`).getTime();
        return dateA - dateB;
      });
    });

    return result;
  }, [filteredEvents]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const draggedId = active.id as string;
    const draggedEvent = filteredEvents.find(e => e.id === draggedId);
    
    if (!draggedEvent) {
      setActiveId(null);
      return;
    }

    const overId = over.id as string;
    let newStatus: "Prévu" | "Terminé" | null = null;
    
    if (statuses.includes(overId as any)) {
      newStatus = overId as "Prévu" | "Terminé";
    } else {
      const targetEvent = filteredEvents.find(e => e.id === overId);
      if (targetEvent) {
        newStatus = targetEvent.status as "Prévu" | "Terminé";
      }
    }

    if (newStatus && draggedEvent.status !== newStatus) {
      onValidate(draggedId, { status: newStatus });
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeEvent = activeId ? filteredEvents.find(e => e.id === activeId) : null;

  // Compter les événements avec d'autres statuts
  const otherStatusCount = events.filter(
    ev => ev.status !== "Prévu" && ev.status !== "Terminé"
  ).length;

  return (
    <>
      {otherStatusCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {otherStatusCount} événement{otherStatusCount > 1 ? "s" : ""} avec le statut "En cours" ou "Chargé" 
            {otherStatusCount > 1 ? " sont" : " est"} masqué{otherStatusCount > 1 ? "s" : ""} dans cette vue. 
            Utilisez la vue Liste ou Agenda pour les gérer.
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statuses.map((status) => {
            const columnEvents = grouped[status] || [];
            const eventIds = columnEvents.map(e => e.id!);

            return (
              <DroppableColumn
                key={status}
                status={status}
                count={columnEvents.length}
                statusColors={statusColors}
              >
                <SortableContext
                  items={eventIds}
                  strategy={verticalListSortingStrategy}
                >
                  {columnEvents.length > 0 ? (
                    columnEvents.map((ev) => (
                      <DraggableCard
                        key={ev.id}
                        ev={ev}
                        onDelete={onDelete}
                      />
                    ))
                  ) : (
                    <div className="text-center py-20 h-full min-h-[400px] flex flex-col items-center justify-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">Aucun événement</p>
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Glissez une carte ici</p>
                    </div>
                  )}
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeEvent ? (
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-blue-400 dark:border-blue-600 rotate-3">
              <p className="font-medium text-sm text-gray-900 dark:text-white">
                {format(new Date(`${activeEvent.date}T${activeEvent.hour}`), "dd/MM à HH:mm")}
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{activeEvent.transporter}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Glissez-déposez les cartes entre "Prévu" et "Terminé" pour changer leur statut
        </p>
      </div>
    </>
  );
}