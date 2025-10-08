import { Calendar, Package, Truck, Check, Undo2, Trash2 } from "lucide-react";
import type { Planning } from "../hooks/usePlannings";
import { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Props {
  events: Planning[];
  onDelete: (id: string) => void;
  onValidate: (id: string) => void;
  onReset: (id: string) => void;
  openDocumentsModal: (id: string) => void;
}

// Fonction utilitaire pour récupérer la semaine en cours
const getCurrentWeekRange = (): [Date, Date] => {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return [monday, sunday];
};

// Normalisation de date depuis string
const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function PlanningList({
  events,
  onDelete,
  onValidate,
  onReset,
  openDocumentsModal,
}: Props) {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(() => 
    getCurrentWeekRange()
  );
  const [startDate, endDate] = dateRange;

  // Mémorisation du scroll
  const scrollPos = useRef(0);
  const saveScroll = () => (scrollPos.current = window.scrollY);
  useEffect(() => {
    window.scrollTo(0, scrollPos.current);
  }, [events]);

  // Filtrage et groupement mémorisés
  const {grouped } = useMemo(() => {
    // Filtrage par plage
    const filtered = events.filter((ev) => {
      if (!startDate || !endDate) return true;
      const evDate = parseDate(ev.date);
      const startTime = new Date(startDate).setHours(0, 0, 0, 0);
      const endTime = new Date(endDate).setHours(23, 59, 59, 999);
      const evTime = evDate.getTime();
      return evTime >= startTime && evTime <= endTime;
    });

    // Groupement par date
    const grouped = filtered.reduce((acc, ev) => {
      (acc[ev.date] = acc[ev.date] || []).push(ev);
      return acc;
    }, {} as Record<string, Planning[]>);

    // Tri des événements dans chaque jour par heure
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const [hourA, minA] = a.hour.split(':').map(Number);
        const [hourB, minB] = b.hour.split(':').map(Number);
        return (hourA * 60 + minA) - (hourB * 60 + minB);
      });
    });

    return { filteredEvents: filtered, grouped };
  }, [events, startDate, endDate]);

  // Dates triées
  const sortedDates = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => 
      parseDate(a).getTime() - parseDate(b).getTime()
    );
  }, [grouped]);

  const statusColors: Record<string, string> = {
    Prévu: "bg-blue-100 text-blue-800",
    "En cours": "bg-yellow-100 text-yellow-800",
    Chargé: "bg-purple-100 text-purple-800",
    Terminé: "bg-green-100 text-green-800",
  };

  const typeColors: Record<string, string> = {
    Réception: "bg-blue-50 text-blue-700",
    Expédition: "bg-orange-50 text-orange-700",
  };

  // Bouton rapide "Aujourd'hui"
  const setToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDateRange([today, today]);
  };

  // Bouton "Cette semaine"
  const setThisWeek = () => {
    setDateRange(getCurrentWeekRange());
  };

  return (
    <div className="space-y-6">
      {/* Barre filtres */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <DatePicker
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => setDateRange(update as [Date | null, Date | null])}
          isClearable
          dateFormat="dd/MM/yyyy"
          placeholderText="Filtrer par période"
          className="border rounded-lg px-3 py-2 text-sm w-60"
          aria-Label="Sélectionner une plage de dates"
        />
        <button
          onClick={setToday}
          className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium border border-blue-300"
        >
          Aujourd'hui
        </button>
        <button
          onClick={setThisWeek}
          className="px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm font-medium border border-purple-300"
        >
          Cette semaine
        </button>
        <button
          onClick={() => setDateRange([null, null])}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium border border-gray-300"
        >
          Tout afficher
        </button>
      </div>

      {/* Message si vide */}
      {sortedDates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Aucun événement</p>
          <p className="text-sm">
            {startDate && endDate 
              ? "Aucun événement dans cette période"
              : "Créez votre premier événement"}
          </p>
        </div>
      )}

      {sortedDates.map((date) => {
        const evs = grouped[date];
        const localDate = parseDate(date);
        
        return (
          <div key={date} className="space-y-2">
            {/* En-tête date */}
            <h3 className="text-gray-700 font-semibold flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              {localDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}
            </h3>

            {/* Liste d'événements */}
            <div className="space-y-2">
              <AnimatePresence>
                {evs.map((ev) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between bg-white rounded-lg border p-3 shadow-sm hover:shadow"
                  >
                    {/* Infos compactes */}
                    <div className="flex items-center gap-3 flex-1">
                      {ev.type === "Réception" ? (
                        <Package className="text-blue-600" size={20} />
                      ) : (
                        <Truck className="text-orange-600" size={20} />
                      )}
                      <span className="w-16 font-medium">{ev.hour}</span>

                      {/* Badge type */}
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          typeColors[ev.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ev.type}
                      </span>

                      <span className="text-gray-500">{ev.transporter}</span>
                      <span className="text-gray-500">{ev.products}</span>

                      {/* Badge statut */}
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          statusColors[ev.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {/* Bouton Docs avec état dynamique */}
                      <button
                        onClick={() => openDocumentsModal(ev.id!)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium ${
                          ev.documents && ev.documents.length > 0
                            ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        Docs
                        {ev.documents && ev.documents.length > 0 && (
                          <span className="ml-1 text-xs font-semibold bg-blue-200 px-1.5 py-0.5 rounded-full">
                            {ev.documents.length}
                          </span>
                        )}
                      </button>

                      {ev.status !== "Terminé" && (
                        <button
                          onClick={() => {
                            saveScroll();
                            onValidate(ev.id!);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full 
                                    bg-green-100 text-green-700 hover:bg-green-200 
                                    border border-green-300 text-sm font-medium"
                        >
                          <Check size={16} /> Valider
                        </button>
                      )}
                      {ev.status !== "Prévu" && (
                        <button
                          onClick={() => {
                            saveScroll();
                            onReset(ev.id!);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full 
                                    bg-gray-100 text-gray-700 hover:bg-gray-200 
                                    border border-gray-300 text-sm font-medium"
                        >
                          <Undo2 size={16} /> Retour
                        </button>
                      )}
                      <button
                        onClick={() => {
                          saveScroll();
                          onDelete(ev.id!);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full 
                                  bg-red-100 text-red-700 hover:bg-red-200 
                                  border border-red-300 text-sm font-medium"
                      >
                        <Trash2 size={16} /> Supprimer
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}