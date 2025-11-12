// src/components/PlanningKanban.tsx - VERSION SIMPLE AVEC CLIC DIRECT SUR QUAI
import { useState, useMemo, useCallback, useEffect } from "react";
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
  GripVertical,
  Edit2,
  Copy,
  Trash2,
  MoreVertical,
  Plus,
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
import { Menu } from "@headlessui/react";
import type { Planning } from "../hooks/useOptimizedPlannings";
import { toast } from "sonner";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string, updates: Partial<Planning>) => Promise<void>;
  onAssignDock?: (eventId: string) => void;
  onEdit?: (event: Planning) => void;
  onDuplicate?: (event: Planning) => void;
  onQuickAdd?: (date: string) => void;
  showDocks?: boolean;
}

// ============================================================
// CONFIGURATION DES TYPES D'ÉVÉNEMENTS
// ============================================================
const EVENT_CONFIG: Record<
  "Réception" | "Expédition",
  {
    gradient: string;
    iconBg: string;
    icon: string;
    textColor: string;
  }
> = {
  Réception: {
    gradient: "from-green-400 to-emerald-500",
    iconBg: "bg-green-100 dark:bg-green-900",
    icon: "📦",
    textColor: "text-green-600 dark:text-green-400",
  },
  Expédition: {
    gradient: "from-blue-400 to-cyan-500",
    iconBg: "bg-blue-100 dark:bg-blue-900",
    icon: "🚚",
    textColor: "text-blue-600 dark:text-blue-400",
  },
};

// ============================================================
// MENU CONTEXTUEL D'ACTIONS
// ============================================================
function EventContextMenu({ 
  event, 
  onEdit, 
  onDuplicate, 
  onDelete,
  onMenuOpen,
}: { 
  event: Planning;
  onEdit?: (event: Planning) => void;
  onDuplicate?: (event: Planning) => void;
  onDelete: (id: string) => void;
  onMenuOpen?: (isOpen: boolean) => void;
}) {
  const handleDelete = () => {
    if (window.confirm(`Supprimer l'événement ${event.transporter} ?`)) {
      onDelete(event.id);
      toast.success("Événement supprimé");
    }
  };

  return (
    <Menu as="div" className="relative">
      {({ open }) => {
        // Notifier le parent quand le menu s'ouvre/ferme
        if (onMenuOpen) {
          onMenuOpen(open);
        }

        return (
          <>
            <Menu.Button 
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] py-1">
              {onEdit && (
                <Menu.Item>
                  {({ active }: { active: boolean}) => (
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onEdit(event);
                      }}
                      className={`${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      } flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                  )}
                </Menu.Item>
              )}
              
              {onDuplicate && (
                <Menu.Item>
                  {({ active }: { active: boolean }) => (
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onDuplicate(event);
                      }}
                      className={`${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      } flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      <Copy className="w-4 h-4" />
                      Dupliquer
                    </button>
                  )}
                </Menu.Item>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className={`${
                      active ? 'bg-red-50 dark:bg-red-900/20' : ''
                    } flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </>
        );
      }}
    </Menu>
  );
}

// ============================================================
// CARTE DRAGGABLE D'ÉVÉNEMENT (VERSION SIMPLE)
// ============================================================
function DraggableEventCard({ 
  event, 
  onDelete,
  onEdit,
  onDuplicate,
  onAssignDock,
  showDocks,
  isDragActive,
}: { 
  event: Planning; 
  onDelete: (id: string) => void;
  onEdit?: (event: Planning) => void;
  onDuplicate?: (event: Planning) => void;
  onAssignDock?: (eventId: string) => void;
  showDocks?: boolean;
  isDragActive?: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const config = EVENT_CONFIG[event.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative mb-2.5 ${isMenuOpen ? 'z-[110]' : 'z-10'}`}
    >
      {/* Carte principale */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500">
        
        {/* Barre gradient supérieure */}
        <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
        
        <div className="p-3">
          {/* En-tête avec type, heure et actions */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              {/* Grip handle - TOUJOURS VISIBLE */}
              <div
                {...listeners}
                {...attributes}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors touch-none"
                title="Glisser pour déplacer"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>

              <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center text-base shadow-sm flex-shrink-0`}>
                {config.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-medium ${config.textColor} uppercase tracking-wide`}>
                  {event.type}
                </p>
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  {event.hour}
                </p>
              </div>
            </div>
            
            {/* Actions menu - visible au hover */}
            <EventContextMenu 
              event={event}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onMenuOpen={(isOpen) => {
                if (isOpen !== isMenuOpen) {
                  setIsMenuOpen(isOpen);
                }
              }}
            />
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

          {/* Gestion des quais - CLIC DIRECT POUR ASSIGNER/MODIFIER */}
          {showDocks && onAssignDock && (
            <div className="mt-2">
              {event.dock_booking ? (
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onAssignDock(event.id);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer group/dock"
                  title="Cliquer pour changer le quai"
                >
                  <Warehouse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300 flex-1 text-left">
                    {(event.dock_booking as any).dock?.name || 'Quai assigné'}
                  </span>
                  <Edit2 className="w-3 h-3 text-purple-400 dark:text-purple-500 opacity-0 group-hover/dock:opacity-100 transition-opacity" />
                </button>
              ) : (
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onAssignDock(event.id);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors text-xs font-medium text-gray-600 dark:text-gray-300"
                  title="Cliquer pour assigner un quai"
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  Assigner un quai
                </button>
              )}
            </div>
          )}
        </div>

        {/* Indicateur de drag actif */}
        {isDragActive && !isDragging && (
          <div className="absolute inset-0 bg-blue-500/5 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// COLONNE DROPPABLE (JOUR)
// ============================================================
function DroppableDay({ 
  day,
  events,
  onDelete,
  onEdit,
  onDuplicate,
  onAssignDock,
  onQuickAdd,
  showDocks,
  isToday,
  isDragActive,
}: { 
  day: Date;
  events: Planning[];
  onDelete: (id: string) => void;
  onEdit?: (event: Planning) => void;
  onDuplicate?: (event: Planning) => void;
  onAssignDock?: (eventId: string) => void;
  onQuickAdd?: (date: string) => void;
  showDocks?: boolean;
  isToday: boolean;
  isDragActive: boolean;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
  });

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border overflow-hidden transition-all duration-200 flex flex-col ${
        isToday
          ? "ring-2 ring-blue-500 dark:ring-blue-400"
          : "border-gray-200 dark:border-gray-700"
      } ${
        isOver ? 'ring-2 ring-green-400 dark:ring-green-500 bg-green-50 dark:bg-green-950 scale-105' : ''
      }`}
    >
      {/* En-tête du jour */}
      <div
        className={`p-3 border-b ${
          isToday
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex-1">
            <div
              className={`text-sm font-medium uppercase ${
                isToday ? "text-white" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {format(day, "EEE", { locale: fr })}
            </div>
            <div
              className={`text-2xl font-bold ${
                isToday ? "text-white" : "text-gray-900 dark:text-white"
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
          
          {/* Bouton + pour ajouter un événement */}
          {onQuickAdd && (
            <button
              onClick={() => onQuickAdd(dateKey)}
              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                isToday
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              }`}
              title="Ajouter un événement"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div
          className={`text-xs flex items-center justify-center gap-1 ${
            isToday ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <span>{events.length}</span>
          <span>événement{events.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Zone de drop avec scroll */}
      <div 
        ref={setNodeRef}
        className="p-2 space-y-2 overflow-y-auto flex-1"
        style={{ minHeight: '400px', maxHeight: '600px' }}
      >
        <SortableContext
          items={events.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {events.length > 0 ? (
            events.map((event) => (
              <DraggableEventCard
                key={event.id}
                event={event}
                onDelete={onDelete}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onAssignDock={onAssignDock}
                showDocks={showDocks}
                isDragActive={isDragActive}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 py-8">
              <Calendar className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs italic mb-3">Aucun événement</p>
              
              {/* CTA Quick Add */}
              {onQuickAdd && (
                <button
                  onClick={() => onQuickAdd(dateKey)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un événement
                </button>
              )}
            </div>
          )}
        </SortableContext>

        {/* Zone de drop visible pendant le drag */}
        {isDragActive && events.length > 0 && (
          <div className="h-16 border-2 border-dashed border-green-400 dark:border-green-500 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 transition-all">
            <p className="text-xs font-medium">Déposer ici</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL : KANBAN SIMPLE
// ============================================================
export default function PlanningKanban({ 
  events, 
  onDelete, 
  onValidate,
  onEdit,
  onDuplicate,
  onAssignDock,
  onQuickAdd,
  showDocks = true 
}: Props) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1, locale: fr })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Détection du mode mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Générer les 7 jours de la semaine (ou 3 sur mobile)
  const weekDays = useMemo(() => {
    const daysToShow = isMobile ? 3 : 7;
    return Array.from({ length: daysToShow }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart, isMobile]);

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
    const daysToMove = isMobile ? 3 : 7;
    setCurrentWeekStart((prev) => addDays(prev, -daysToMove));
  }, [isMobile]);

  const goToNextWeek = useCallback(() => {
    const daysToMove = isMobile ? 3 : 7;
    setCurrentWeekStart((prev) => addDays(prev, daysToMove));
  }, [isMobile]);

  const goToToday = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }));
  }, []);

  // Configuration drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor,{
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
        toast.success("Événement déplacé");
      } catch (error) {
        console.error("Erreur lors du déplacement:", error);
        toast.error("Erreur lors du déplacement");
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeEvent = activeId ? events.find(e => e.id === activeId) : null;

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !e.shiftKey) {
        goToPreviousWeek();
      } else if (e.key === "ArrowRight" && !e.shiftKey) {
        goToNextWeek();
      } else if (e.key === "t" || e.key === "T") {
        goToToday();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPreviousWeek, goToNextWeek, goToToday]);

  return (
    <div className="space-y-4">
      {/* Header avec navigation améliorée */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            aria-label="Période précédente"
            title="← Période précédente"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </button>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
            {isMobile ? (
              format(weekDays[0], "d MMM yyyy", { locale: fr })
            ) : (
              <>
                Semaine du {format(weekDays[0], "d MMM", { locale: fr })} au{" "}
                {format(weekDays[weekDays.length - 1], "d MMM yyyy", { locale: fr })}
              </>
            )}
          </h2>

          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            aria-label="Période suivante"
            title="→ Période suivante"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </button>
        </div>

        <button
          onClick={goToToday}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium shadow-md hover:shadow-lg"
          title="T - Aller à aujourd'hui"
        >
          <Calendar className="w-4 h-4" />
          Aujourd'hui
        </button>
      </div>

      {/* Info drag & drop avec raccourcis clavier */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <GripVertical className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              💡 Glissez-déposez les événements entre les jours pour changer leur date
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              Raccourcis : <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">←</kbd> <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">→</kbd> pour naviguer • <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs">T</kbd> pour aujourd'hui
            </p>
          </div>
        </div>
      </div>

      {/* Grille Kanban avec DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`grid gap-3 ${
          isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-7'
        }`}>
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
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onAssignDock={onAssignDock}
                onQuickAdd={onQuickAdd}
                showDocks={showDocks}
                isToday={isToday}
                isDragActive={!!activeId}
              />
            );
          })}
        </div>

        {/* Overlay pendant le drag avec preview amélioré */}
        <DragOverlay>
          {activeEvent && (
            <div className="rotate-2 scale-105 opacity-90">
              <DraggableEventCard
                event={activeEvent}
                onDelete={onDelete}
                showDocks={showDocks}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}