// src/components/PlanningAgenda.tsx - VERSION RESPONSIVE MOBILE COMPLÈTE
import { useState, useMemo, useCallback, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog } from "@headlessui/react";
import { Check, Trash2 } from "lucide-react";
import { Planning } from "../hooks/usePlannings";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string) => void;
  onReset: (id: string) => void;
  companyId: string;
  onUpdate: (ev: Planning) => Promise<void>;
  onOpenAddModal: (initialData?: Partial<Planning>) => void;
}

const locales = {
  'fr': fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

export default function PlanningAgenda({
  events,
  onDelete,
  onUpdate,
  onOpenAddModal,
}: Props) {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Planning | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Détecter le mode sombre
  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const calendarEvents = useMemo(() => {
    return events.map(ev => {
      const [year, month, day] = ev.date.split('-').map(Number);
      const [hour, minute] = ev.hour.split(':').map(Number);
      
      const start = new Date(year, month - 1, day, hour, minute);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (ev.duration || 30));
  
      // Format: "Expédition - DHL - 33 pals"
      const title = [ev.type, ev.transporter, ev.products]
        .filter(Boolean)
        .join(' - ');
  
      return {
        id: ev.id,
        title,
        start,
        end,
        resource: ev,
      };
    });
  }, [events]);

  const eventStyleGetter = useCallback((event: any) => {
    const ev = event.resource as Planning;
    
    let backgroundColor = '#3b82f6';
    if (ev.type === "Expédition") backgroundColor = '#f97316';
    if (ev.status === "Terminé") backgroundColor = '#10b981';
    if (ev.status === "En cours") backgroundColor = '#eab308';
    if (ev.status === "Chargé") backgroundColor = '#a855f7';

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.85,
        color: 'white',
        border: '2px solid white',
        display: 'block',
        fontSize: '0.75rem',
        lineHeight: '1.2',
        padding: '4px',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
      }
    };
  }, []);

  const handleSelectSlot = useCallback((slotInfo: any) => {
    const startDate = slotInfo.start as Date;
    
    onOpenAddModal({
      date: format(startDate, 'yyyy-MM-dd'),
      hour: format(startDate, 'HH:mm'),
      type: "Réception",
      transporter: "",
      products: "",
      status: "Prévu",
      duration: 30,
    });
  }, [onOpenAddModal]);

  const handleSelectEvent = useCallback((event: any) => {
    const ev = event.resource as Planning;
    setSelectedEvent(ev);
  }, []);

  const handleEventDrop = useCallback(async ({ event, start, end }: any) => {
    const ev = event.resource as Planning;
    
    if (!ev.id) {
      console.error("ID manquant pour l'événement");
      return;
    }

    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    const updatedData = {
      date: format(start, 'yyyy-MM-dd'),
      hour: format(start, 'HH:mm'),
      duration: duration > 0 ? duration : 30,
    };

    try {
      await onUpdate({ ...ev, ...updatedData });
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
      alert("Impossible de déplacer l'événement. Veuillez réessayer.");
    }
  }, [onUpdate]);

  const handleEventResize = useCallback(async ({ event, start, end }: any) => {
    const ev = event.resource as Planning;
    
    if (!ev.id) {
      console.error("ID manquant pour l'événement");
      return;
    }

    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    const updatedData = {
      date: format(start, 'yyyy-MM-dd'),
      hour: format(start, 'HH:mm'),
      duration: duration > 0 ? duration : 30,
    };

    try {
      await onUpdate({ ...ev, ...updatedData });
    } catch (error) {
      console.error("Erreur lors du resize:", error);
      alert("Impossible de redimensionner l'événement. Veuillez réessayer.");
    }
  }, [onUpdate]);

  const closeEventDetail = () => {
    setSelectedEvent(null);
  };

  // ✅ STYLES COMPLETS AVEC RESPONSIVE MOBILE INTÉGRÉ
  const calendarStyles = `
    /* === STYLES DE BASE === */
    ${isDark ? `
      /* Dark mode */
      .calendar-adaptive .rbc-calendar { background-color: transparent; }
      .calendar-adaptive .rbc-header { background-color: #374151; color: white; border-color: #4b5563; padding: 10px; font-weight: 600; }
      .calendar-adaptive .rbc-time-view { background-color: #1f2937; border-color: #374151; }
      .calendar-adaptive .rbc-time-content { border-color: #374151; }
      .calendar-adaptive .rbc-time-slot { border-color: #374151; }
      .calendar-adaptive .rbc-day-slot { background-color: #111827; }
      .calendar-adaptive .rbc-today { background-color: #1e3a5f !important; }
      .calendar-adaptive .rbc-timeslot-group { border-color: #374151; background-color: #1f2937; }
      .calendar-adaptive .rbc-time-header-content { border-color: #374151; }
      .calendar-adaptive .rbc-time-header-gutter { background-color: #374151; }
      .calendar-adaptive .rbc-label { color: #9ca3af; }
      .calendar-adaptive .rbc-current-time-indicator { background-color: #ef4444; }
      .calendar-adaptive .rbc-toolbar { padding: 15px 10px; background-color: #1f2937; border-radius: 8px; margin-bottom: 15px; }
      .calendar-adaptive .rbc-toolbar button { color: white; background-color: #374151; border: 1px solid #4b5563; padding: 8px 16px; border-radius: 6px; font-weight: 500; }
      .calendar-adaptive .rbc-toolbar button:hover { background-color: #4b5563; }
      .calendar-adaptive .rbc-toolbar button.rbc-active { background-color: #3b82f6; border-color: #3b82f6; }
      .calendar-adaptive .rbc-toolbar-label { color: #ffffff; font-weight: 600; font-size: 1.1rem; }
      .calendar-adaptive .rbc-month-view { background-color: #1f2937; border-color: #374151; }
      .calendar-adaptive .rbc-month-row { border-color: #374151; }
      .calendar-adaptive .rbc-day-bg { background-color: #111827; border-color: #374151; }
      .calendar-adaptive .rbc-off-range-bg { background-color: #0f172a; }
      .calendar-adaptive .rbc-off-range .rbc-date-cell { color: #6b7280; }
      .calendar-adaptive .rbc-date-cell { color: #ffffff !important; }
      .calendar-adaptive .rbc-date-cell button { color: #ffffff !important; }
      .calendar-adaptive .rbc-button-link { color: #ffffff !important; }
      .calendar-adaptive .rbc-event { font-size: 0.875rem; }
      .calendar-adaptive .rbc-show-more { background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
      .calendar-adaptive .rbc-agenda-view { background-color: #1f2937; }
      .calendar-adaptive .rbc-agenda-view table { background-color: #1f2937; border-color: #374151; }
      .calendar-adaptive .rbc-agenda-view thead { background-color: #374151; }
      .calendar-adaptive .rbc-agenda-view thead th { background-color: #374151; color: #ffffff; border-color: #4b5563; font-weight: 600; padding: 12px; }
      .calendar-adaptive .rbc-agenda-view tbody { background-color: #1f2937; }
      .calendar-adaptive .rbc-agenda-view tbody tr { border-color: #374151; }
      .calendar-adaptive .rbc-agenda-view tbody tr:hover { background-color: #374151; }
      .calendar-adaptive .rbc-agenda-table { border-color: #374151; }
      .calendar-adaptive .rbc-agenda-date-cell, .calendar-adaptive .rbc-agenda-time-cell { background-color: #1f2937; color: #ffffff; border-color: #374151; padding: 12px; }
      .calendar-adaptive .rbc-agenda-event-cell { background-color: #1f2937; color: #ffffff; border-color: #374151; padding: 12px; }
      .calendar-adaptive .rbc-agenda-empty { color: #9ca3af; }
    ` : `
      /* Light mode */
      .calendar-adaptive .rbc-calendar { background-color: white; }
      .calendar-adaptive .rbc-header { background-color: #f3f4f6; color: #111827; border-color: #e5e7eb; padding: 10px; font-weight: 600; }
      .calendar-adaptive .rbc-time-view { background-color: white; border-color: #e5e7eb; }
      .calendar-adaptive .rbc-time-content { border-color: #e5e7eb; }
      .calendar-adaptive .rbc-time-slot { border-color: #e5e7eb; }
      .calendar-adaptive .rbc-day-slot { background-color: white; }
      .calendar-adaptive .rbc-today { background-color: #dbeafe !important; }
      .calendar-adaptive .rbc-timeslot-group { border-color: #e5e7eb; background-color: white; }
      .calendar-adaptive .rbc-time-header-content { border-color: #e5e7eb; }
      .calendar-adaptive .rbc-time-header-gutter { background-color: #f3f4f6; }
      .calendar-adaptive .rbc-label { color: #6b7280; }
      .calendar-adaptive .rbc-current-time-indicator { background-color: #ef4444; }
      .calendar-adaptive .rbc-toolbar { padding: 15px 10px; background-color: white; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e5e7eb; }
      .calendar-adaptive .rbc-toolbar button { color: #374151; background-color: white; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; font-weight: 500; }
      .calendar-adaptive .rbc-toolbar button:hover { background-color: #f9fafb; }
      .calendar-adaptive .rbc-toolbar button.rbc-active { background-color: #3b82f6; color: white; border-color: #3b82f6; }
      .calendar-adaptive .rbc-toolbar-label { color: #111827; font-weight: 600; font-size: 1.1rem; }
      .calendar-adaptive .rbc-month-view { background-color: white; border-color: #e5e7eb; }
      .calendar-adaptive .rbc-month-row { border-color: #e5e7eb; }
      .calendar-adaptive .rbc-day-bg { background-color: white; border-color: #e5e7eb; }
      .calendar-adaptive .rbc-off-range-bg { background-color: #f9fafb; }
      .calendar-adaptive .rbc-off-range .rbc-date-cell { color: #9ca3af; }
      .calendar-adaptive .rbc-date-cell { color: #111827 !important; }
      .calendar-adaptive .rbc-date-cell button { color: #111827 !important; }
      .calendar-adaptive .rbc-button-link { color: #111827 !important; }
      .calendar-adaptive .rbc-event { font-size: 0.875rem; }
      .calendar-adaptive .rbc-show-more { background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
      .calendar-adaptive .rbc-agenda-view { background-color: white; }
      .calendar-adaptive .rbc-agenda-view table { background-color: white; border-color: #e5e7eb; }
      .calendar-adaptive .rbc-agenda-view thead { background-color: #f3f4f6; }
      .calendar-adaptive .rbc-agenda-view thead th { background-color: #f3f4f6; color: #111827; border-color: #d1d5db; font-weight: 600; padding: 12px; }
      .calendar-adaptive .rbc-agenda-view tbody { background-color: white; }
      .calendar-adaptive .rbc-agenda-view tbody tr { border-color: #e5e7eb; }
      .calendar-adaptive .rbc-agenda-view tbody tr:hover { background-color: #f9fafb; }
      .calendar-adaptive .rbc-agenda-table { border-color: #e5e7eb; }
      .calendar-adaptive .rbc-agenda-date-cell, .calendar-adaptive .rbc-agenda-time-cell { background-color: white; color: #111827; border-color: #e5e7eb; padding: 12px; }
      .calendar-adaptive .rbc-agenda-event-cell { background-color: white; color: #111827; border-color: #e5e7eb; padding: 12px; }
      .calendar-adaptive .rbc-agenda-empty { color: #6b7280; }
    `}

    /* === RESPONSIVE MOBILE (< 768px) === */
    @media (max-width: 768px) {
      /* Toolbar responsive */
      .calendar-adaptive .rbc-toolbar {
        flex-direction: column;
        gap: 10px;
        padding: 10px 5px !important;
      }

      .calendar-adaptive .rbc-toolbar-label {
        font-size: 0.95rem !important;
        text-align: center;
        width: 100%;
        order: -1;
      }

      .calendar-adaptive .rbc-toolbar button {
        padding: 6px 10px !important;
        font-size: 0.8rem !important;
      }

      .calendar-adaptive .rbc-btn-group {
        display: flex;
        gap: 4px;
      }

      /* Headers plus compacts */
      .calendar-adaptive .rbc-header {
        padding: 5px 2px !important;
        font-size: 0.75rem !important;
      }

      /* Événements plus lisibles */
      .calendar-adaptive .rbc-event {
        font-size: 0.7rem !important;
        padding: 2px 4px !important;
      }

      /* Labels horaires plus petits */
      .calendar-adaptive .rbc-label {
        font-size: 0.65rem !important;
      }

      /* Time slots plus compacts */
      .calendar-adaptive .rbc-time-slot {
        min-height: 30px !important;
      }

      /* Vue agenda responsive */
      .calendar-adaptive .rbc-agenda-view table {
        font-size: 0.8rem;
      }

      .calendar-adaptive .rbc-agenda-view thead th {
        padding: 8px 4px !important;
        font-size: 0.75rem !important;
      }

      .calendar-adaptive .rbc-agenda-date-cell,
      .calendar-adaptive .rbc-agenda-time-cell,
      .calendar-adaptive .rbc-agenda-event-cell {
        padding: 8px 4px !important;
        font-size: 0.8rem !important;
      }

      /* Bouton "show more" */
      .calendar-adaptive .rbc-show-more {
        font-size: 0.65rem !important;
        padding: 2px 6px !important;
      }

      /* Scroll optimization */
      .calendar-adaptive .rbc-time-content {
        -webkit-overflow-scrolling: touch;
      }
    }

    /* === PETITS ÉCRANS (< 480px) === */
    @media (max-width: 480px) {
      .calendar-adaptive .rbc-toolbar-label {
        font-size: 0.85rem !important;
      }

      .calendar-adaptive .rbc-header {
        font-size: 0.7rem !important;
        padding: 4px 1px !important;
      }

      .calendar-adaptive .rbc-event {
        font-size: 0.65rem !important;
        padding: 1px 2px !important;
      }

      .calendar-adaptive .rbc-event-label {
        display: none;
      }

      .calendar-adaptive .rbc-time-slot {
        min-height: 25px !important;
      }
    }

    /* === PAYSAGE MOBILE === */
    @media (max-width: 768px) and (orientation: landscape) {
      .calendar-adaptive .rbc-toolbar {
        flex-direction: row;
        padding: 5px !important;
      }

      .calendar-adaptive .rbc-toolbar-label {
        font-size: 0.9rem !important;
      }
    }
  `;

  return (
    <div className="h-[calc(100vh-200px)] md:h-[calc(100vh-200px)] sm:h-[calc(100vh-140px)] calendar-adaptive">
      <style>{calendarStyles}</style>
      
      <DnDCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor={(event: any) => event.start}
        endAccessor={(event: any) => event.end}
        style={{ height: '100%' }}
        culture="fr"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        eventPropGetter={eventStyleGetter}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        selectable
        resizable
        step={60}
        timeslots={1}
        defaultView="week"
        views={['month', 'week', 'day', 'agenda']}
        dayLayoutAlgorithm="no-overlap"
        messages={{
          next: "Suivant",
          previous: "Précédent",
          today: "Aujourd'hui",
          month: "Mois",
          week: "Semaine",
          day: "Jour",
          agenda: "Agenda",
          date: "Date",
          time: "Heure",
          event: "Événement",
          noEventsInRange: "Aucun événement dans cette période",
          showMore: (total) => `+ ${total} événement(s) supplémentaire(s)`,
        }}
      />

      {/* Modal de détail */}
      {selectedEvent && (
        <Dialog open={true} onClose={closeEventDetail} className="relative z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Modifier l'événement
              </Dialog.Title>

              <div className="space-y-4 mb-6">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={selectedEvent.type}
                    onChange={(e) => setSelectedEvent({...selectedEvent, type: e.target.value as "Réception" | "Expédition"})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Réception">Réception</option>
                    <option value="Expédition">Expédition</option>
                  </select>
                </div>

                {/* Transporteur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Transporteur
                  </label>
                  <input
                    type="text"
                    value={selectedEvent.transporter}
                    onChange={(e) => setSelectedEvent({...selectedEvent, transporter: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Produits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Produits
                  </label>
                  <input
                    type="text"
                    value={selectedEvent.products || ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, products: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedEvent.date}
                    onChange={(e) => setSelectedEvent({...selectedEvent, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Heure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={selectedEvent.hour}
                    onChange={(e) => setSelectedEvent({...selectedEvent, hour: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Durée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    value={selectedEvent.duration || 30}
                    onChange={(e) => setSelectedEvent({...selectedEvent, duration: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="15"
                    step="15"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Statut
                  </label>
                  <select
                    value={selectedEvent.status}
                    onChange={(e) => setSelectedEvent({
                      ...selectedEvent, 
                      status: e.target.value as "Prévu" | "En cours" | "Chargé" | "Terminé"
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Prévu">Prévu</option>
                    <option value="En cours">En cours</option>
                    <option value="Chargé">Chargé</option>
                    <option value="Terminé">Terminé</option>
                  </select>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={async () => {
                    await onUpdate(selectedEvent);
                    closeEventDetail();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Check className="w-4 h-4" />
                  Enregistrer
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
                      onDelete(selectedEvent.id!);
                      closeEventDetail();
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
                
                <button
                  onClick={closeEventDetail}
                  className="flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
}