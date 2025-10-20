// src/components/PlanningKanban.tsx - AVEC DATE RANGE PICKER À DROITE
import { useState, useMemo } from "react";
import { format, startOfToday, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
import type { Planning } from "../hooks/usePlannings";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string, updates: Partial<Planning>) => Promise<void>;
}

function DraggableCard({ ev, onDelete }: { ev: Planning; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ev.id!,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const bgColor = ev.type === "Réception" 
    ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
    : "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800";

  const textColor = ev.type === "Réception"
    ? "text-blue-700 dark:text-blue-300"
    : "text-orange-700 dark:text-orange-300";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 mb-2 rounded-lg border shadow-sm cursor-move hover:shadow-md transition-all ${bgColor}`}
    >
      <div className="flex justify-between items-start mb-2">
        <p className={`font-medium text-sm ${textColor}`}>
          {format(new Date(`${ev.date}T${ev.hour}`), "dd/MM à HH:mm", { locale: fr })}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          ev.type === "Réception" 
            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" 
            : "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
        }`}>
          {ev.type}
        </span>
      </div>
      
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{ev.transporter}</p>
      {ev.products && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{ev.products}</p>
      )}

      <div className="flex justify-end mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
              onDelete(ev.id!);
            }
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
  
  // États pour le filtrage par date
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const statusColors: Record<string, string> = {
    "Prévu": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
    "Terminé": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
  };

  // Fonction pour définir la période à "Aujourd'hui"
  const setToday = () => {
    const today = startOfToday();
    setDateRange([startOfDay(today), endOfDay(today)]);
  };

  // Fonction pour définir la période à "Cette semaine"
  const setThisWeek = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1, locale: fr });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1, locale: fr });
    setDateRange([weekStart, weekEnd]);
  };

  // Filtrer les événements par date
  const dateFilteredEvents = useMemo(() => {
    if (!startDate || !endDate) {
      return events;
    }

    return events.filter(ev => {
      const eventDate = new Date(ev.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }, [events, startDate, endDate]);

  // Filtrer uniquement Prévu et Terminé
  const filteredEvents = useMemo(() => {
    return dateFilteredEvents.filter(ev => ev.status === "Prévu" || ev.status === "Terminé");
  }, [dateFilteredEvents]);

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
      {/* Sélecteur de plage de dates + boutons rapides ALIGNÉS À DROITE */}
      <div className="mb-4 flex flex-wrap justify-end gap-3 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => {
              setDateRange(update as [Date | null, Date | null]);
            }}
            isClearable={true}
            placeholderText="Sélectionner une période"
            dateFormat="dd/MM/yyyy"
            locale={fr}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
            wrapperClassName="w-full sm:w-auto"
            calendarClassName="dark:bg-gray-800"
          />
        </div>

        <button
          onClick={setToday}
          className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium border border-blue-300 
                     dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 dark:border-blue-700"
        >
          Aujourd'hui
        </button>
        <button
          onClick={setThisWeek}
          className="px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm font-medium border border-purple-300
                     dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800 dark:border-purple-700"
        >
          Cette semaine
        </button>
        <button
          onClick={() => setDateRange([null, null])}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium border border-gray-300
                     dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600"
        >
          Tout afficher
        </button>
      </div>

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
                {format(new Date(`${activeEvent.date}T${activeEvent.hour}`), "dd/MM à HH:mm", { locale: fr })}
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