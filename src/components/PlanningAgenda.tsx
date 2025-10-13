// src/components/PlanningAgenda.tsx - THÈME ADAPTATIF
import { useState, useMemo, useCallback, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog } from "@headlessui/react";
import { Check, Undo2, Trash2 } from "lucide-react";
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
  onValidate,
  onReset,
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

      return {
        id: ev.id,
        title: `${ev.type} - ${ev.transporter}`,
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
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
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

  // Styles dynamiques selon le thème
  const calendarStyles = isDark ? `
    /* Dark mode */
    .calendar-adaptive .rbc-calendar {
      background-color: transparent;
    }
    
    .calendar-adaptive .rbc-header {
      background-color: #374151;
      color: white;
      border-color: #4b5563;
      padding: 10px;
      font-weight: 600;
    }
    
    .calendar-adaptive .rbc-time-view {
      background-color: #1f2937;
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-time-content {
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-time-slot {
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-day-slot {
      background-color: #111827;
    }
    
    .calendar-adaptive .rbc-today {
      background-color: #1e3a5f !important;
    }
    
    .calendar-adaptive .rbc-timeslot-group {
      border-color: #374151;
      background-color: #1f2937;
    }
    
    .calendar-adaptive .rbc-time-header-content {
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-time-header-gutter {
      background-color: #374151;
    }
    
    .calendar-adaptive .rbc-label {
      color: #9ca3af;
    }
    
    .calendar-adaptive .rbc-current-time-indicator {
      background-color: #ef4444;
    }
    
    .calendar-adaptive .rbc-toolbar {
      padding: 15px 10px;
      background-color: #1f2937;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    
    .calendar-adaptive .rbc-toolbar button {
      color: white;
      background-color: #374151;
      border: 1px solid #4b5563;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
    }
    
    .calendar-adaptive .rbc-toolbar button:hover {
      background-color: #4b5563;
    }
    
    .calendar-adaptive .rbc-toolbar button.rbc-active {
      background-color: #3b82f6;
      border-color: #3b82f6;
    }
    
    .calendar-adaptive .rbc-toolbar-label {
      color: #ffffff;
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    .calendar-adaptive .rbc-month-view {
      background-color: #1f2937;
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-month-row {
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-day-bg {
      background-color: #111827;
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-off-range-bg {
      background-color: #0f172a;
    }
    
    .calendar-adaptive .rbc-off-range .rbc-date-cell {
      color: #6b7280;
    }
    
    .calendar-adaptive .rbc-date-cell {
      color: #ffffff !important;
    }
    
    .calendar-adaptive .rbc-date-cell button {
      color: #ffffff !important;
    }
    
    .calendar-adaptive .rbc-button-link {
      color: #ffffff !important;
    }
    
    .calendar-adaptive .rbc-event {
      font-size: 0.875rem;
    }
    
    .calendar-adaptive .rbc-show-more {
      background-color: #3b82f6;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    
    .calendar-adaptive .rbc-agenda-view {
      background-color: #1f2937;
    }
    
    .calendar-adaptive .rbc-agenda-view table {
      background-color: #1f2937;
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-agenda-view thead {
      background-color: #374151;
    }
    
    .calendar-adaptive .rbc-agenda-view thead th {
      background-color: #374151;
      color: #ffffff;
      border-color: #4b5563;
      font-weight: 600;
      padding: 12px;
    }
    
    .calendar-adaptive .rbc-agenda-view tbody {
      background-color: #1f2937;
    }
    
    .calendar-adaptive .rbc-agenda-view tbody tr {
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-agenda-view tbody tr:hover {
      background-color: #374151;
    }
    
    .calendar-adaptive .rbc-agenda-table {
      border-color: #374151;
    }
    
    .calendar-adaptive .rbc-agenda-date-cell,
    .calendar-adaptive .rbc-agenda-time-cell {
      background-color: #1f2937;
      color: #ffffff;
      border-color: #374151;
      padding: 12px;
    }
    
    .calendar-adaptive .rbc-agenda-event-cell {
      background-color: #1f2937;
      color: #ffffff;
      border-color: #374151;
      padding: 12px;
    }
    
    .calendar-adaptive .rbc-agenda-empty {
      color: #9ca3af;
    }
  ` : `
    /* Light mode */
    .calendar-adaptive .rbc-calendar {
      background-color: white;
    }
    
    .calendar-adaptive .rbc-header {
      background-color: #f3f4f6;
      color: #111827;
      border-color: #e5e7eb;
      padding: 10px;
      font-weight: 600;
    }
    
    .calendar-adaptive .rbc-time-view {
      background-color: white;
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-time-content {
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-time-slot {
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-day-slot {
      background-color: white;
    }
    
    .calendar-adaptive .rbc-today {
      background-color: #dbeafe !important;
    }
    
    .calendar-adaptive .rbc-timeslot-group {
      border-color: #e5e7eb;
      background-color: white;
    }
    
    .calendar-adaptive .rbc-time-header-content {
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-time-header-gutter {
      background-color: #f3f4f6;
    }
    
    .calendar-adaptive .rbc-label {
      color: #6b7280;
    }
    
    .calendar-adaptive .rbc-current-time-indicator {
      background-color: #ef4444;
    }
    
    .calendar-adaptive .rbc-toolbar {
      padding: 15px 10px;
      background-color: white;
      border-radius: 8px;
      margin-bottom: 15px;
      border: 1px solid #e5e7eb;
    }
    
    .calendar-adaptive .rbc-toolbar button {
      color: #374151;
      background-color: white;
      border: 1px solid #d1d5db;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
    }
    
    .calendar-adaptive .rbc-toolbar button:hover {
      background-color: #f9fafb;
    }
    
    .calendar-adaptive .rbc-toolbar button.rbc-active {
      background-color: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    
    .calendar-adaptive .rbc-toolbar-label {
      color: #111827;
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    .calendar-adaptive .rbc-month-view {
      background-color: white;
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-month-row {
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-day-bg {
      background-color: white;
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-off-range-bg {
      background-color: #f9fafb;
    }
    
    .calendar-adaptive .rbc-off-range .rbc-date-cell {
      color: #9ca3af;
    }
    
    .calendar-adaptive .rbc-date-cell {
      color: #111827 !important;
    }
    
    .calendar-adaptive .rbc-date-cell button {
      color: #111827 !important;
    }
    
    .calendar-adaptive .rbc-button-link {
      color: #111827 !important;
    }
    
    .calendar-adaptive .rbc-event {
      font-size: 0.875rem;
    }
    
    .calendar-adaptive .rbc-show-more {
      background-color: #3b82f6;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    
    .calendar-adaptive .rbc-agenda-view {
      background-color: white;
    }
    
    .calendar-adaptive .rbc-agenda-view table {
      background-color: white;
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-agenda-view thead {
      background-color: #f3f4f6;
    }
    
    .calendar-adaptive .rbc-agenda-view thead th {
      background-color: #f3f4f6;
      color: #111827;
      border-color: #d1d5db;
      font-weight: 600;
      padding: 12px;
    }
    
    .calendar-adaptive .rbc-agenda-view tbody {
      background-color: white;
    }
    
    .calendar-adaptive .rbc-agenda-view tbody tr {
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-agenda-view tbody tr:hover {
      background-color: #f9fafb;
    }
    
    .calendar-adaptive .rbc-agenda-table {
      border-color: #e5e7eb;
    }
    
    .calendar-adaptive .rbc-agenda-date-cell,
    .calendar-adaptive .rbc-agenda-time-cell {
      background-color: white;
      color: #111827;
      border-color: #e5e7eb;
      padding: 12px;
    }
    
    .calendar-adaptive .rbc-agenda-event-cell {
      background-color: white;
      color: #111827;
      border-color: #e5e7eb;
      padding: 12px;
    }
    
    .calendar-adaptive .rbc-agenda-empty {
      color: #6b7280;
    }
  `;

  return (
    <div className="h-[700px] calendar-adaptive">
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
        step={30}
        timeslots={2}
        defaultView="week"
        views={['month', 'week', 'day', 'agenda']}
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
            <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Détails de l'événement
              </Dialog.Title>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedEvent.type === "Réception"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                      : "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200"
                  }`}>
                    {selectedEvent.type}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedEvent.status === "Prévu" ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200" :
                    selectedEvent.status === "En cours" ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" :
                    selectedEvent.status === "Chargé" ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200" :
                    "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                  }`}>
                    {selectedEvent.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {selectedEvent.date} à {selectedEvent.hour}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Durée:</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {selectedEvent.duration || 30} minutes
                  </span>
                </div>
                
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transporteur:</span>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                    {selectedEvent.transporter}
                  </p>
                </div>
                
                {selectedEvent.products && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Produits:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedEvent.products}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedEvent.status !== "Terminé" && (
                  <button
                    onClick={() => {
                      onValidate(selectedEvent.id!);
                      closeEventDetail();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    <Check size={16} /> Valider
                  </button>
                )}
                
                {selectedEvent.status !== "Prévu" && (
                  <button
                    onClick={() => {
                      onReset(selectedEvent.id!);
                      closeEventDetail();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                  >
                    <Undo2 size={16} /> Réinitialiser
                  </button>
                )}
                
                <button
                  onClick={() => {
                    onDelete(selectedEvent.id!);
                    closeEventDetail();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors ml-auto"
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>

              <button
                onClick={closeEventDetail}
                className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Fermer
              </button>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
}