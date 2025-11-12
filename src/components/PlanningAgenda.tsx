// src/components/PlanningAgenda.tsx - VERSION RESPONSIVE MOBILE COMPLÈTE
import { useState, useMemo, useCallback, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog } from "@headlessui/react";
import { Check, Trash2 } from "lucide-react";
import type { Planning } from "../hooks/useOptimizedPlannings";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string) => void;
  onReset: (id: string) => void;
  companyId: string;
  onUpdate: (event: Planning) => void;
  onOpenAddModal: (data?: Partial<Planning>) => void;
  showDocks?: boolean;
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
  companyId,
  onUpdate,
  onOpenAddModal,
  showDocks = true,
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

  // Composant personnalisé pour la vue mois - affiche uniquement le nombre d'événements
  const MonthEvent = ({ event }: { event: any }) => {
    return null; // On n'affiche rien, on gère tout dans le MonthDateCell
  };

  // Composant pour afficher le nombre d'événements par jour dans la vue mois
  const MonthDateCell = ({ label, date }: { label: React.ReactNode; date: Date }) => {
    if (view !== 'month') return <div>{label}</div>;
    
    // Compter les événements pour ce jour
    const dayEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

    const eventCount = dayEvents.length;
    
    // Compter par type
    const receptions = dayEvents.filter(e => e.resource.type === "Réception").length;
    const expeditions = dayEvents.filter(e => e.resource.type === "Expédition").length;

    return (
      <div className="relative h-full min-h-[120px]">
        <div>{label}</div>
        {eventCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center font-bold text-xl shadow-lg cursor-pointer hover:bg-blue-700 hover:scale-105 transition-all">
                {eventCount}
              </div>
              {(receptions > 0 || expeditions > 0) && (
                <div className="flex gap-1.5 text-xs">
                  {receptions > 0 && (
                    <span className="bg-green-500 text-white px-2.5 py-1 rounded-full font-medium shadow">
                      📦 {receptions}
                    </span>
                  )}
                  {expeditions > 0 && (
                    <span className="bg-blue-500 text-white px-2.5 py-1 rounded-full font-medium shadow">
                      🚚 {expeditions}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

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

  // Nouveau handler pour le clic sur une date en vue mois
  const handleSelectSlotMonth = useCallback((slotInfo: any) => {
    if (view === 'month') {
      const clickedDate = slotInfo.start as Date;
      
      // Trouver tous les événements de ce jour
      const dayEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.start);
        return (
          eventDate.getDate() === clickedDate.getDate() &&
          eventDate.getMonth() === clickedDate.getMonth() &&
          eventDate.getFullYear() === clickedDate.getFullYear()
        );
      });

      if (dayEvents.length > 0) {
        // S'il y a des événements, ouvrir le premier (ou créer une modal liste)
        setSelectedEvent(dayEvents[0].resource);
      } else {
        // Sinon, créer un nouvel événement
        onOpenAddModal({
          date: format(clickedDate, 'yyyy-MM-dd'),
          hour: format(new Date(), 'HH:mm'),
          type: "Réception",
          transporter: "",
          products: "",
          status: "Prévu",
          duration: 30,
        });
      }
    } else {
      // Comportement normal pour les autres vues
      handleSelectSlot(slotInfo);
    }
  }, [view, calendarEvents, onOpenAddModal]);

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
      console.error("Erreur lors du redimensionnement:", error);
      alert("Impossible de redimensionner l'événement. Veuillez réessayer.");
    }
  }, [onUpdate]);

  const closeEventDetail = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleUpdateEvent = useCallback(async () => {
    if (!selectedEvent) return;
    
    try {
      await onUpdate(selectedEvent);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour de l'événement.");
    }
  }, [selectedEvent, onUpdate]);

  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent?.id) return;
    
    if (confirm("Voulez-vous vraiment supprimer cet événement ?")) {
      try {
        await onDelete(selectedEvent.id);
        setSelectedEvent(null);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression de l'événement.");
      }
    }
  }, [selectedEvent, onDelete]);

  const handleValidateEvent = useCallback(async () => {
    if (!selectedEvent?.id) return;
    
    try {
      await onValidate(selectedEvent.id);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      alert("Erreur lors de la validation de l'événement.");
    }
  }, [selectedEvent, onValidate]);

  // Styles CSS personnalisés pour le calendrier
  const calendarStyles = `
    .rbc-calendar {
      font-family: inherit;
      background: ${isDark ? '#1f2937' : 'white'};
      color: ${isDark ? '#f3f4f6' : '#111827'};
      border-radius: 12px;
      overflow: hidden;
    }

    .rbc-header {
      padding: 12px 8px;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${isDark ? '#374151' : '#f9fafb'};
      color: ${isDark ? '#f3f4f6' : '#374151'};
      border-bottom: 2px solid ${isDark ? '#4b5563' : '#e5e7eb'};
    }

    .rbc-today {
      background-color: ${isDark ? '#1e3a8a22' : '#dbeafe'};
    }

    .rbc-off-range-bg {
      background: ${isDark ? '#111827' : '#f9fafb'};
    }

    .rbc-event {
      border: none !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      min-height: 20px !important; /* Hauteur minimum pour la vue mois */
    }

    .rbc-event:hover {
      opacity: 1 !important;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 10;
    }

    /* Cacher l'heure automatique du calendrier pour garder juste le title */
    .rbc-event-label {
      display: none;
    }

    .rbc-event-content {
      font-weight: 600;
      padding: 2px 4px;
      overflow: hidden;
    }

    /* Améliorer l'affichage en vue mois */
    .rbc-month-view .rbc-event,
    .rbc-month-view .rbc-row-segment,
    .rbc-month-view .rbc-event-content {
      display: none !important; /* Masquer complètement tous les événements individuels en vue mois */
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .rbc-month-view .rbc-show-more {
      display: none !important; /* Masquer le "show more" */
    }

    .rbc-month-view .rbc-row-content {
      position: relative;
      min-height: 120px !important;
    }

    .rbc-month-view .rbc-date-cell {
      padding: 4px;
      min-height: 120px !important;
    }

    .rbc-month-view .rbc-day-bg {
      cursor: pointer;
      min-height: 120px !important;
    }

    .rbc-month-view .rbc-month-row {
      min-height: 120px !important;
    }

    .rbc-month-view .rbc-event-content {
      font-size: 0.7rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rbc-day-slot .rbc-time-slot {
      border-top: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
    }

    /* === STYLES AMÉLIORÉS POUR LA VUE AGENDA === */
    .rbc-agenda-view {
      background: ${isDark ? '#1f2937' : 'white'};
      border-radius: 8px;
    }

    .rbc-agenda-view table.rbc-agenda-table {
      border: none;
    }

    .rbc-agenda-view .rbc-agenda-date-cell,
    .rbc-agenda-view .rbc-agenda-time-cell,
    .rbc-agenda-view .rbc-agenda-event-cell {
      padding: 12px 16px;
      vertical-align: middle;
    }

    .rbc-agenda-view thead {
      display: none; /* Masquer les en-têtes de tableau */
    }

    .rbc-agenda-view .rbc-agenda-date-cell {
      width: 100%;
      border-bottom: none !important;
      padding: 0 !important;
    }

    .rbc-agenda-view .rbc-agenda-time-cell {
      font-weight: 600;
      color: ${isDark ? '#9ca3af' : '#6b7280'};
      white-space: nowrap;
      font-size: 0.875rem;
    }

    .rbc-agenda-view tbody > tr {
      border-bottom: 1px solid ${isDark ? '#374151' : '#f3f4f6'};
    }

    .rbc-agenda-view tbody > tr:hover {
      background: ${isDark ? '#374151' : '#f9fafb'};
    }

    .rbc-agenda-view tbody > tr > td:first-child {
      font-weight: 600;
    }

    .rbc-time-header-content {
      border-left: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
    }

    .rbc-time-content {
      border-top: 2px solid ${isDark ? '#4b5563' : '#e5e7eb'};
    }

    .rbc-timeslot-group {
      border-left: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
    }

    .rbc-day-bg + .rbc-day-bg {
      border-left: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
    }

    .rbc-month-view {
      border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      border-radius: 8px;
      overflow: hidden;
    }

    .rbc-month-row {
      border-top: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
    }

    .rbc-date-cell {
      padding: 8px;
    }

    .rbc-button-link {
      color: ${isDark ? '#f3f4f6' : '#111827'};
    }

    .rbc-show-more {
      background: ${isDark ? '#374151' : '#f3f4f6'};
      color: ${isDark ? '#f3f4f6' : '#374151'};
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-top: 2px;
    }

    .rbc-toolbar {
      padding: 16px;
      background: ${isDark ? '#111827' : 'white'};
      border-bottom: 2px solid ${isDark ? '#374151' : '#e5e7eb'};
      margin-bottom: 0;
    }

    .rbc-toolbar button {
      color: ${isDark ? '#f3f4f6' : '#374151'};
      border: 1px solid ${isDark ? '#4b5563' : '#d1d5db'};
      background: ${isDark ? '#374151' : 'white'};
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .rbc-toolbar button:hover {
      background: ${isDark ? '#4b5563' : '#f3f4f6'};
    }

    .rbc-toolbar button.rbc-active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    .rbc-toolbar button:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    /* Vue mois - événements plus visibles */
    .rbc-month-view .rbc-event {
      padding: 3px 5px !important;
      margin: 2px !important;
      border-radius: 4px;
      font-size: 12px !important;
      line-height: 1.4 !important;
      min-height: 22px;
      display: block !important;
      overflow: visible !important;
    }

    .rbc-month-view .rbc-event-content {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block !important;
    }

    .rbc-month-view .rbc-event-label {
      display: block !important;
    }

    .rbc-month-view .rbc-row-segment {
      padding: 1px 2px;
    }

    /* Vue agenda */
    .rbc-agenda-view {
      padding: 10px;
    }

    .rbc-agenda-view table {
      width: 100%;
      border-collapse: collapse;
    }

    .rbc-agenda-view .rbc-agenda-table tbody > tr > td {
      padding: 8px;
      border-bottom: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    }

    .rbc-agenda-view .rbc-agenda-event-cell {
      font-size: 14px;
    }

    .rbc-agenda-date-cell,
    .rbc-agenda-time-cell {
      font-weight: 500;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .rbc-toolbar {
        flex-direction: column;
        gap: 12px;
      }

      .rbc-toolbar-label {
        font-size: 1rem;
        text-align: center;
      }

      .rbc-toolbar button {
        padding: 6px 12px;
        font-size: 0.875rem;
      }

      .rbc-header {
        padding: 8px 4px;
        font-size: 0.75rem;
      }

      .rbc-event {
        font-size: 0.7rem;
        padding: 2px;
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
        onSelectSlot={handleSelectSlotMonth}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        selectable
        resizable
        step={60}
        timeslots={1}
        defaultView="week"
        views={['month', 'week', 'day']}
        dayLayoutAlgorithm="no-overlap"
        components={{
          month: {
            event: MonthEvent,
            dateHeader: MonthDateCell,
          }
        }}
        messages={{
          next: "Suivant",
          previous: "Précédent",
          today: "Aujourd'hui",
          month: "Mois",
          week: "Semaine",
          day: "Jour",
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
                    min="15"
                    step="15"
                    value={selectedEvent.duration || 30}
                    onChange={(e) => setSelectedEvent({...selectedEvent, duration: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Statut
                  </label>
                  <select
                    value={selectedEvent.status}
                    onChange={(e) => setSelectedEvent({...selectedEvent, status: e.target.value as any})}
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleUpdateEvent}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Enregistrer
                </button>
                
                {selectedEvent.status !== "Terminé" && (
                  <button
                    onClick={handleValidateEvent}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Check size={18} />
                    Valider
                  </button>
                )}
                
                <button
                  onClick={handleDeleteEvent}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Trash2 size={18} />
                  Supprimer
                </button>
                
                <button
                  onClick={closeEventDetail}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
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