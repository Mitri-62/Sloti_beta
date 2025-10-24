// src/components/PlanningKanban.tsx - VERSION COMPLÈTE AVEC DESIGN COMPACT
import { useState, useMemo, useCallback } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Warehouse,
  AlertTriangle,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
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
import type { Planning } from "../hooks/useOptimizedPlannings";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string, updates: Partial<Planning>) => Promise<void>;
  onAssignDock?: (eventId: string) => void;
  showDocks?: boolean;
}

// ============================================================
// COMPOSANT : CARTE DRAGGABLE D'ÉVÉNEMENT (VERSION COMPACTE)
// ============================================================
function DraggableEventCard({ 
  event, 
  onDelete,
  onAssignDock,
  showDocks 
}: { 
  event: Planning; 
  onDelete: (id: string) => void;
  onAssignDock?: (eventId: string) => void;
  showDocks?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeConfig: Record<string, { gradient: string; icon: string; iconBg: string; textColor: string }> = {
    Réception: {
      gradient: "from-blue-500 to-blue-600",
      icon: "📦",
      iconBg: "bg-blue-100 dark:bg-blue-900",
      textColor: "text-blue-700 dark:text-blue-300"
    },
    Expédition: {
      gradient: "from-orange-500 to-orange-600",
      icon: "🚚",
      iconBg: "bg-orange-100 dark:bg-orange-900",
      textColor: "text-orange-700 dark:text-orange-300"
    },
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    Prévu: { 
      bg: "bg-blue-50 dark:bg-blue-950", 
      text: "text-blue-700 dark:text-blue-300",
      dot: "bg-blue-500"
    },
    "En cours": { 
      bg: "bg-yellow-50 dark:bg-yellow-950", 
      text: "text-yellow-700 dark:text-yellow-300",
      dot: "bg-yellow-500"
    },
    Chargé: { 
      bg: "bg-purple-50 dark:bg-purple-950", 
      text: "text-purple-700 dark:text-purple-300",
      dot: "bg-purple-500"
    },
    Terminé: { 
      bg: "bg-green-50 dark:bg-green-950", 
      text: "text-green-700 dark:text-green-300",
      dot: "bg-green-500"
    },
  };

  const config = typeConfig[event.type];
  const statusStyle = statusConfig[event.status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative mb-2.5 cursor-move"
    >
      {/* Carte principale */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Barre gradient supérieure */}
        <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
        
        <div className="p-3">
          {/* En-tête compact avec type et heure */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center text-base shadow-sm`}>
                {config.icon}
              </div>
              <div>
                <p className={`text-[10px] font-medium ${config.textColor} uppercase tracking-wide`}>
                  {event.type}
                </p>
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  {event.hour}
                </p>
              </div>
            </div>
            
            {/* Badge statut - visible au hover uniquement */}
            <div className={`
              flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusStyle.bg}
              opacity-0 group-hover:opacity-100 transition-opacity
            `}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              <span className={`text-[10px] font-semibold ${statusStyle.text}`}>
                {event.status}
              </span>
            </div>
          </div>

          {/* Transporteur */}
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-2 line-clamp-1">
            {event.transporter}
          </h3>

          {/* Produits */}
          {event.products && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
              {event.products}
            </p>
          )}

          {/* Métadonnées compactes */}
          <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-500 dark:text-gray-400">
            {event.duration && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{event.duration} min</span>
              </div>
            )}
          </div>

          {/* Badge Quai OU Bouton Assigner */}
          {showDocks && (
            <div className="mb-2">
              {event.dock_booking ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAssignDock) {
                      onAssignDock(event.id);
                    }
                  }}
                  className="w-full flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg transition-colors group/dock"
                >
                  <Warehouse className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-200">
                      {event.dock_booking.dock.name}
                    </p>
                    {event.dock_booking.dock.zone && (
                      <p className="text-[10px] text-green-600 dark:text-green-400">
                        Zone {event.dock_booking.dock.zone}
                      </p>
                    )}
                  </div>
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400 opacity-0 group-hover/dock:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAssignDock) {
                      onAssignDock(event.id);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900 border border-orange-200 dark:border-orange-800 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium text-orange-800 dark:text-orange-200">
                    Assigner un quai
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Bouton supprimer - icône seule */}
          <div className="flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
                  onDelete(event.id);
                }
              }}
              className="p-1.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
              title="Supprimer"
              aria-label="Supprimer l'événement"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Indicateur de drag (3 points verticaux) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT : COLONNE DROPPABLE (JOUR)
// ============================================================
function DroppableDay({ 
  day,
  events,
  onDelete,
  onAssignDock,
  showDocks,
  isToday
}: { 
  day: Date;
  events: Planning[];
  onDelete: (id: string) => void;
  onAssignDock?: (eventId: string) => void;
  showDocks?: boolean;
  isToday: boolean;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
  });

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border overflow-hidden transition-colors flex flex-col ${
        isToday
          ? "ring-2 ring-blue-500 dark:ring-blue-400"
          : "border-gray-200 dark:border-gray-700"
      } ${
        isOver ? 'ring-2 ring-green-400 dark:ring-green-500 bg-green-50 dark:bg-green-950' : ''
      }`}
    >
      {/* En-tête du jour */}
      <div
        className={`p-3 text-center border-b ${
          isToday
            ? "bg-blue-600 text-white"
            : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        }`}
      >
        <div
          className={`text-sm font-medium uppercase ${
            isToday ? "text-white" : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {format(day, "EEE", { locale: fr })}
        </div>
        <div
          className={`text-2xl font-bold mt-1 ${
            isToday ? "text-white" : "text-gray-900 dark:text-white"
          }`}
        >
          {format(day, "d")}
        </div>
        <div
          className={`text-xs mt-1 ${
            isToday ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {events.length} événement{events.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Zone de drop élargie */}
      <div 
        ref={setNodeRef}
        className="p-2 space-y-2 overflow-y-auto flex-1"
        style={{ minHeight: '400px' }}
      >
        <SortableContext
          items={events.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {events.length > 0 ? (
            <>
              {events.map((event) => (
                <DraggableEventCard
                  key={event.id}
                  event={event}
                  onDelete={onDelete}
                  onAssignDock={onAssignDock}
                  showDocks={showDocks}
                />
              ))}
              {/* Zone de drop supplémentaire en bas */}
              <div 
                className="h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
              >
                <p className="text-xs">Déposer ici</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <Calendar className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs italic">Aucun événement</p>
              <p className="text-xs mt-1">Glissez une carte ici</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL : KANBAN AVEC VUE SEMAINE
// ============================================================
export default function PlanningKanban({ 
  events, 
  onDelete, 
  onValidate,
  onAssignDock,
  showDocks = true 
}: Props) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1, locale: fr })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // Générer les 7 jours de la semaine
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Grouper les événements par jour
  const eventsByDay = useMemo(() => {
    const map: Record<string, Planning[]> = {};
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      map[key] = [];
    });

    events.forEach((ev) => {
      const evDate = parseISO(ev.date);
      const key = format(evDate, "yyyy-MM-dd");
      if (map[key]) {
        map[key].push(ev);
      }
    });

    // Trier par heure dans chaque jour
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        const [hourA, minA] = a.hour.split(":").map(Number);
        const [hourB, minB] = b.hour.split(":").map(Number);
        return hourA * 60 + minA - (hourB * 60 + minB);
      });
    });

    return map;
  }, [events, weekDays]);

  // Navigation
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }));
  }, []);

  // Configuration drag & drop
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) {
      return;
    }

    const draggedId = active.id as string;
    const draggedEvent = events.find(e => e.id === draggedId);
    
    if (!draggedEvent) {
      return;
    }

    let overId = over.id as string;
    let targetDate: string | null = null;

    // CAS 1 : Drop directement sur un jour (yyyy-MM-dd)
    if (overId.match(/^\d{4}-\d{2}-\d{2}$/)) {
      targetDate = overId;
    } 
    // CAS 2 : Drop sur un autre événement → prendre sa date
    else {
      const targetEvent = events.find(e => e.id === overId);
      if (targetEvent) {
        targetDate = targetEvent.date;
      }
    }

    // Mettre à jour si date différente
    if (targetDate && draggedEvent.date !== targetDate) {
      try {
        await onValidate(draggedId, { date: targetDate });
      } catch (error) {
        console.error("Erreur lors du déplacement:", error);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeEvent = activeId ? events.find(e => e.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Header avec navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
            Semaine du {format(weekDays[0], "d MMM", { locale: fr })} au{" "}
            {format(weekDays[6], "d MMM yyyy", { locale: fr })}
          </h2>

          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <button
          onClick={goToToday}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Calendar className="w-4 h-4" />
          Aujourd'hui
        </button>
      </div>

      {/* Info drag & drop */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 Glissez-déposez les événements entre les jours pour changer leur date
        </p>
      </div>

      {/* Grille Kanban avec DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay[dateKey] || [];
            const isToday = isSameDay(day, new Date());

            return (
              <DroppableDay
                key={dateKey}
                day={day}
                events={dayEvents}
                onDelete={onDelete}
                onAssignDock={onAssignDock}
                showDocks={showDocks}
                isToday={isToday}
              />
            );
          })}
        </div>

        {/* Overlay pendant le drag */}
        <DragOverlay>
          {activeEvent ? (
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-blue-400 dark:border-blue-600 rotate-3 opacity-90">
              <p className="font-medium text-sm text-gray-900 dark:text-white">
                {activeEvent.hour} - {activeEvent.transporter}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {activeEvent.type}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}