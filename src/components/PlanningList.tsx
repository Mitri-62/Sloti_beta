// src/components/PlanningList.tsx - AVEC QUAIS
import { Calendar, Package, Truck, Check, Undo2, Trash2, Copy, FileText, Warehouse, AlertTriangle } from "lucide-react";
import type { Planning } from "../hooks/useOptimizedPlannings";
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
  onDuplicate: (event: Planning) => void;
  showDocks?: boolean; // ✅ AJOUTÉ
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
  onDuplicate,
  showDocks = true, // ✅ AJOUTÉ
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
  const { grouped } = useMemo(() => {
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

    return { grouped };
  }, [events, startDate, endDate]);

  // Dates triées
  const sortedDates = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => 
      parseDate(a).getTime() - parseDate(b).getTime()
    );
  }, [grouped]);

  const statusColors: Record<string, string> = {
    Prévu: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "En cours": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    Chargé: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    Terminé: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  const typeColors: Record<string, string> = {
    Réception: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
    Expédition: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
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
      {/* Style pour le DatePicker en dark mode */}
      <style>{`
        .react-datepicker {
          background-color: #1f2937;
          border-color: #374151;
        }
        
        .dark .react-datepicker {
          background-color: #1f2937;
          border-color: #374151;
        }
        
        .react-datepicker__header {
          background-color: #374151;
          border-bottom-color: #4b5563;
        }
        
        .react-datepicker__current-month,
        .react-datepicker__day-name,
        .react-datepicker__day {
          color: #ffffff;
        }
        
        .react-datepicker__day:hover {
          background-color: #3b82f6;
        }
        
        .react-datepicker__day--selected,
        .react-datepicker__day--in-range {
          background-color: #3b82f6;
        }
        
        .react-datepicker__day--disabled {
          color: #6b7280;
        }
      `}</style>

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
          className="border rounded-lg px-3 py-2 text-sm w-60 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          aria-label="Sélectionner une plage de dates"
        />
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

      {/* Message si vide */}
      {sortedDates.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Aucun événement</p>
          <p className="text-sm">
            {startDate && endDate 
              ? "Aucun événement dans la période sélectionnée"
              : "Aucun événement prévu"}
          </p>
        </div>
      )}

      {/* Liste des événements par date */}
      {sortedDates.map((date) => {
        const dateObj = parseDate(date);
        const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });

        return (
          <div key={date} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* En-tête de date */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-4">
              <h3 className="text-white font-bold text-lg capitalize">
                {dayName}
              </h3>
              <p className="text-blue-100 dark:text-blue-200 text-sm">{formattedDate}</p>
            </div>

            {/* Événements du jour */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <AnimatePresence mode="popLayout">
                {grouped[date].map((ev) => (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Heure et type */}
                      <div className="flex items-center gap-3 lg:w-48">
                        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                          <span className="text-2xl">{ev.hour}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${typeColors[ev.type]}`}>
                          {ev.type === "Réception" ? (
                            <Package size={14} className="inline mr-1" />
                          ) : (
                            <Truck size={14} className="inline mr-1" />
                          )}
                          {ev.type}
                        </span>
                      </div>

                      {/* Informations */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-lg">
                          {ev.transporter}
                        </p>
                        {ev.products && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {ev.products}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[ev.status]}`}>
                            {ev.status}
                          </span>
                          {ev.duration && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Durée: {ev.duration} min
                            </span>
                          )}
                          
                          {/* ✅ AJOUTÉ - Badge Quai */}
                          {showDocks && (
                            ev.dock_booking ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 border border-green-300 rounded-full text-xs font-medium text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200">
                                <Warehouse className="w-3 h-3" />
                                {ev.dock_booking.dock.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100 border border-orange-300 rounded-full text-xs font-medium text-orange-800 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200">
                                <AlertTriangle className="w-3 h-3" />
                                Aucun quai
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openDocumentsModal(ev.id!)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                            ev.documents && ev.documents.length > 0
                              ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 dark:hover:bg-blue-800"
                              : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                          }`}
                        >
                          <FileText size={16} />
                          Docs
                          {ev.documents && ev.documents.length > 0 && (
                            <span className="ml-1 text-xs font-semibold bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full">
                              {ev.documents.length}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            saveScroll();
                            onDuplicate(ev);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full 
                                    bg-indigo-100 text-indigo-700 hover:bg-indigo-200 
                                    border border-indigo-300 text-sm font-medium transition-colors
                                    dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 dark:border-indigo-700"
                        >
                          <Copy size={16} /> Dupliquer
                        </button>

                        {ev.status !== "Terminé" && (
                          <button
                            onClick={() => {
                              saveScroll();
                              onValidate(ev.id!);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full 
                                      bg-green-100 text-green-700 hover:bg-green-200 
                                      border border-green-300 text-sm font-medium transition-colors
                                      dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 dark:border-green-700"
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
                                      border border-gray-300 text-sm font-medium transition-colors
                                      dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600"
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
                                    border border-red-300 text-sm font-medium transition-colors
                                    dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 dark:border-red-700"
                        >
                          <Trash2 size={16} /> Supprimer
                        </button>
                      </div>
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