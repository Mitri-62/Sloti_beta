// src/components/PlanningAgenda.tsx
import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog } from "@headlessui/react";
import { Planning } from "../hooks/usePlannings";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string) => void;
  onReset: (id: string) => void;
  add: (planning: Omit<Planning, "id">) => Promise<void>;
  companyId: string;
  onUpdate: (ev: Planning) => Promise<void>;
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

// Créer le composant Calendar avec drag & drop
const DnDCalendar = withDragAndDrop(Calendar);

export default function PlanningAgenda({
  events,
  onDelete,
  onValidate,
  onReset,
  add,
  companyId,
  onUpdate,
}: Props) {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Planning | null>(null);
  
  const [newEvent, setNewEvent] = useState<Partial<Planning>>({
    date: "",
    hour: "",
    type: "Réception",
    transporter: "",
    products: "",
    status: "Prévu",
    duration: 30,
  });

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
    
    setNewEvent({
      date: format(startDate, 'yyyy-MM-dd'),
      hour: format(startDate, 'HH:mm'),
      type: "Réception",
      transporter: "",
      products: "",
      status: "Prévu",
      duration: 30,
    });
    setError("");
    setIsOpen(true);
  }, []);

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
    
    // Ne garder que les champs qui existent dans la table plannings
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
    
    // Ne garder que les champs qui existent dans la table plannings
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

  const handleSave = async () => {
    if (!newEvent.transporter?.trim()) {
      setError("Le transporteur est requis");
      return;
    }
    
    if (!newEvent.date || !newEvent.hour) {
      setError("Date et heure sont requises");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await add({ ...newEvent, company_id: companyId } as Omit<Planning, "id">);
      setIsOpen(false);
      setNewEvent({
        date: "",
        hour: "",
        type: "Réception",
        transporter: "",
        products: "",
        status: "Prévu",
        duration: 30,
      });
    } catch (err) {
      setError("Erreur lors de la création de l'événement");
    } finally {
      setLoading(false);
    }
  };

  const closeEventDetail = () => {
    setSelectedEvent(null);
  };

  return (
    <div className="h-[700px]">
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

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              Nouvel événement
            </Dialog.Title>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                className="border p-2 w-full rounded"
                value={newEvent.type}
                onChange={(e) => setNewEvent({ 
                  ...newEvent, 
                  type: e.target.value as "Réception" | "Expédition"
                })}
              >
                <option value="Réception">Réception</option>
                <option value="Expédition">Expédition</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Transporteur *</label>
              <input
                className="border p-2 w-full rounded"
                placeholder="Nom du transporteur"
                value={newEvent.transporter}
                onChange={(e) => setNewEvent({ ...newEvent, transporter: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Produits</label>
              <input
                className="border p-2 w-full rounded"
                placeholder="Description des produits"
                value={newEvent.products}
                onChange={(e) => setNewEvent({ ...newEvent, products: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Durée (minutes)</label>
              <input
                type="number"
                min={30}
                step={30}
                className="border p-2 w-full rounded"
                placeholder="30"
                value={newEvent.duration || 30}
                onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value, 10) || 30 })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setError("");
                }}
                className="px-4 py-2 rounded border hover:bg-gray-50"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className={`px-4 py-2 rounded text-white ${
                  loading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={!!selectedEvent} onClose={closeEventDetail} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              Détails de l'événement
            </Dialog.Title>

            {selectedEvent && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Type:</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      selectedEvent.type === "Réception" 
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {selectedEvent.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Statut:</span>
                    <span className="text-sm">{selectedEvent.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-sm">{selectedEvent.date} à {selectedEvent.hour}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Transporteur:</span>
                    <span className="text-sm font-semibold">{selectedEvent.transporter}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Produits:</span>
                    <p className="text-sm text-gray-600 mt-1">{selectedEvent.products}</p>
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      onDelete(selectedEvent.id!);
                      closeEventDetail();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                  
                  <div className="flex gap-2">
                    {selectedEvent.status !== "Prévu" && (
                      <button
                        onClick={() => {
                          onReset(selectedEvent.id!);
                          closeEventDetail();
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Réinitialiser
                      </button>
                    )}
                    {selectedEvent.status !== "Terminé" && (
                      <button
                        onClick={() => {
                          onValidate(selectedEvent.id!);
                          closeEventDetail();
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Valider
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      <style>{`
        .rbc-toolbar button {
          padding: 8px 16px;
          border-radius: 6px;
        }
        .rbc-toolbar button.rbc-active {
          background-color: #3b82f6;
          color: white;
        }
        .rbc-time-slot {
          min-height: 40px;
        }
        .rbc-event {
          padding: 2px 5px;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        .rbc-event * {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        .rbc-addons-dnd-resizable {
          cursor: move;
          user-select: none;
        }
        .rbc-addons-dnd-resize-ns-anchor {
          cursor: ns-resize;
        }
        .rbc-addons-dnd .rbc-addons-dnd-resizable {
          position: relative;
        }
        .rbc-calendar {
          user-select: none;
        }
        .rbc-time-content {
          user-select: none;
        }
      `}</style>
    </div>
  );
}