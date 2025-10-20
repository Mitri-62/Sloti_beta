// src/pages/Planning.tsx - VERSION OPTIMISÉE AVEC EXPORT PAR PÉRIODE
import { useState, useMemo, useCallback } from "react";
import { 
  Calendar as CalendarIcon, 
  List, 
  Kanban, 
  Plus, 
  Download, 
  Mail, 
  BarChart, 
  Filter,
  AlertCircle,
} from "lucide-react";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";


import { useAuth } from "../contexts/AuthContext";
import type { Planning } from "../hooks/useOptimizedPlannings";
import { useOptimizedPlannings } from "../hooks/useOptimizedPlannings";
import { validatePlanning, validateEventDateTime } from "../schemas/planningSchema";
import { errorService } from "../services/errorService";

import PlanningList from "../components/PlanningList";
import PlanningKanban from "../components/PlanningKanban";
import PlanningAgenda from "../components/PlanningAgenda";
import ForecastView from "../components/ForecastView";
import DocumentsModal from "../components/DocumentsModal";


type ViewType = "list" | "kanban" | "agenda" | "forecast";

export default function Planning() {
  const { user, isLoading: authLoading } = useAuth();
  const companyId = user?.company_id ?? null;

  // ✅ Hook optimisé avec React Query
  const { plannings, add, update, remove, loading, reload } = useOptimizedPlannings(
    companyId,
    { forecastOnly: false, enableRealtime: true }
  );

  const [view, setView] = useState<ViewType>("agenda");
  const [showFilters, setShowFilters] = useState(false);
  const [filterTransporter, setFilterTransporter] = useState<string>("Tous");
  const [filterType, setFilterType] = useState<string>("Tous");
  const [filterStatus, setFilterStatus] = useState<string>("Tous");

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const [docPlanningId, setDocPlanningId] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const [newEvent, setNewEvent] = useState<Partial<Planning>>({
    date: "",
    hour: "",
    type: "Réception",
    transporter: "",
    products: "",
    status: "Prévu",
    duration: 30,
  });

  // 🔹 Fonctions utilitaires
  const openDocumentsModal = useCallback((id: string) => {
    setDocPlanningId(id);
    setIsDocModalOpen(true);
  }, []);
  
  const closeDocumentsModal = useCallback(() => {
    setDocPlanningId(null);
    setIsDocModalOpen(false);
  }, []);

  const openAddModal = useCallback((initialData?: Partial<Planning>) => {
    setEditingId(null);
    setNewEvent(initialData || {
      date: "",
      hour: "",
      type: "Réception",
      transporter: "",
      products: "",
      status: "Prévu",
      duration: 30,
    });
    setSaveError("");
    setValidationErrors({});
    setIsOpen(true);
  }, []);

  const handleDuplicate = useCallback((event: Planning) => {
    openAddModal({
      date: event.date,
      hour: event.hour,
      type: event.type,
      transporter: event.transporter,
      products: event.products,
      status: "Prévu",
      duration: event.duration || 30,
    });
    toast.info("Événement dupliqué, modifiez les détails si nécessaire");
  }, [openAddModal]);

  // ✅ SAVE simplifié avec gestion d'erreur optimisée
  const handleSave = useCallback(async () => {
    setSaveError("");
    setValidationErrors({});

    try {
      const validation = validatePlanning(newEvent);
      if (!validation.success) {
        const errorMap: Record<string, string> = {};
        validation.errors.forEach(err => {
          errorMap[err.field] = err.message;
        });
        setValidationErrors(errorMap);
        setSaveError(validation.message);
        return;
      }

      if (!editingId) {
        const dateTimeValidation = validateEventDateTime(
          validation.data.date, 
          validation.data.hour,
          false
        );
        
        if (!dateTimeValidation.success) {
          setSaveError(dateTimeValidation.message);
          setValidationErrors({ date: dateTimeValidation.message });
          return;
        }
      }

      if (editingId) {
        await update(editingId, validation.data);
      } else {
        await add(validation.data as Omit<Planning, "id">);
      }

      resetForm();

    } catch (error) {
      const appError = errorService.normalizeError(error);
      setSaveError(appError.message);
    }
  }, [newEvent, editingId, update, add]);

  const resetForm = useCallback(() => {
    setNewEvent({
      date: "",
      hour: "",
      type: "Réception",
      transporter: "",
      products: "",
      status: "Prévu",
      duration: 30,
    });
    setEditingId(null);
    setSaveError("");
    setValidationErrors({});
    setIsOpen(false);
  }, []);

  // ✅ DELETE simplifié
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;
    
    try {
      await remove(id);
    } catch (error) {
      // Erreur déjà gérée par le hook
    }
  }, [remove]);

  // ✅ UPDATE STATUS
  const handleUpdateStatusKanban = useCallback(async (id: string, updates: Partial<Planning>) => {
    try {
      await update(id, updates);
    } catch (error) {
      // Erreur déjà gérée par le hook
    }
  }, [update]);

  const handleUpdateStatus = useCallback(async (id: string, status: Planning["status"]) => {
    try {
      await update(id, { status });
    } catch (error) {
      // Erreur déjà gérée par le hook
    }
  }, [update]);

  const handleValidate = useCallback(async (id: string) => {
    await handleUpdateStatus(id, "Terminé");
  }, [handleUpdateStatus]);

  const handleReset = useCallback(async (id: string) => {
    await handleUpdateStatus(id, "Prévu");
  }, [handleUpdateStatus]);

  const handleUpdateEvent = useCallback(async (ev: Planning) => {
    try {
      await update(ev.id, ev);
    } catch (error) {
      // Erreur déjà gérée
    }
  }, [update]);

  // 🔹 Filtres
  const filteredEvents = useMemo(() => {
    return plannings.filter((ev) => {
      if (filterTransporter !== "Tous" && ev.transporter !== filterTransporter) return false;
      if (filterType !== "Tous" && ev.type !== filterType) return false;
      if (filterStatus !== "Tous" && ev.status !== filterStatus) return false;
      return true;
    });
  }, [plannings, filterTransporter, filterType, filterStatus]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterTransporter !== "Tous") count++;
    if (filterType !== "Tous") count++;
    if (filterStatus !== "Tous") count++;
    return count;
  }, [filterTransporter, filterType, filterStatus]);

  const transporterOptions = useMemo(() => {
    return ["Tous", ...new Set(plannings.map((e) => e.transporter))];
  }, [plannings]);

  // 🔹 Filtre pour l'export par période
  const getFilteredPlanningsForExport = useCallback(() => {
    if (!exportStartDate || !exportEndDate) {
      return filteredEvents;
    }
    
    return filteredEvents.filter(planning => {
      return planning.date >= exportStartDate && planning.date <= exportEndDate;
    });
  }, [filteredEvents, exportStartDate, exportEndDate]);

  // 🔹 Export CSV avec période
  const handleExportCSV = useCallback(() => {
    const planningsToExport = getFilteredPlanningsForExport();
    
    if (planningsToExport.length === 0) {
      toast.error("Aucun événement à exporter pour cette période");
      return;
    }

    const csv = [
      "Date,Heure,Type,Transporteur,Produits,Statut",
      ...planningsToExport.map((e) =>
        `${e.date},${e.hour},${e.type},${e.transporter},"${e.products}",${e.status}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planning_${exportStartDate || 'complet'}_${exportEndDate || 'complet'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    toast.success("CSV exporté avec succès");
  }, [getFilteredPlanningsForExport, exportStartDate, exportEndDate]);

  // 🔹 Export PDF avec période
  const handleExportPDF = useCallback(() => {
    const planningsToExport = getFilteredPlanningsForExport();
    
    if (planningsToExport.length === 0) {
      toast.error("Aucun événement à exporter pour cette période");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Planning - Export", 14, 20);
    
    if (exportStartDate && exportEndDate) {
      doc.setFontSize(10);
      doc.text(`Période : ${format(new Date(exportStartDate), 'dd/MM/yyyy')} - ${format(new Date(exportEndDate), 'dd/MM/yyyy')}`, 14, 28);
    }

    const tableData = planningsToExport.map((p) => [
      format(new Date(p.date), "dd/MM/yyyy"),
      p.hour,
      p.type,
      p.transporter,
      p.products || "-",
      p.status,
    ]);

    (doc as any).autoTable({
      startY: exportStartDate && exportEndDate ? 32 : 25,
      head: [["Date", "Heure", "Type", "Transporteur", "Produits", "Statut"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`planning_${exportStartDate || 'complet'}_${exportEndDate || 'complet'}.pdf`);
    setShowExportModal(false);
    toast.success("PDF exporté avec succès");
  }, [getFilteredPlanningsForExport, exportStartDate, exportEndDate]);

  // 🔹 Envoi par email avec période
  const handleSendEmail = useCallback(() => {
    const planningsToExport = getFilteredPlanningsForExport();
    
    if (planningsToExport.length === 0) {
      toast.error("Aucun événement à envoyer pour cette période");
      return;
    }

    const subject = exportStartDate && exportEndDate 
      ? `Planning du ${format(new Date(exportStartDate), 'dd/MM/yyyy')} au ${format(new Date(exportEndDate), 'dd/MM/yyyy')}`
      : "Planning complet";
      
    const body = planningsToExport
      .map(
        (p) =>
          `${format(new Date(p.date), "dd/MM/yyyy")} ${p.hour} - ${p.type} - ${p.transporter} - ${p.products || "-"} - ${p.status}`
      )
      .join("\n");

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    setShowExportModal(false);
    toast.success("Client email ouvert");
  }, [getFilteredPlanningsForExport, exportStartDate, exportEndDate]);

  // 🔹 Statistiques
  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const receptions = filteredEvents.filter((e) => e.type === "Réception").length;
    const expeditions = filteredEvents.filter((e) => e.type === "Expédition").length;
    const termines = filteredEvents.filter((e) => e.status === "Terminé").length;
    return { total, receptions, expeditions, termines };
  }, [filteredEvents]);

  // 🔹 Loading states
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            Accès refusé
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Veuillez vous connecter pour accéder au planning
          </p>
        </div>
      </div>
    );
  }

  // 🔹 Vue principale
  const viewButtons = [
    { view: "list" as ViewType, icon: List, label: "Liste" },
    { view: "kanban" as ViewType, icon: Kanban, label: "Kanban" },
    { view: "agenda" as ViewType, icon: CalendarIcon, label: "Agenda" },
    { view: "forecast" as ViewType, icon: BarChart, label: "Prévisions" },
  ];

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-blue-600" />
          Planning
        </h1>

        {view !== "forecast" && (
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" /> Nouvel événement
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* View Switcher */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm">
          {viewButtons.map((btn) => (
            <button
              key={btn.view}
              onClick={() => setView(btn.view)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                view === btn.view
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300"
              }`}
            >
              <btn.icon className="w-4 h-4" /> {btn.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {view !== "forecast" && (
            <>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg shadow hover:bg-gray-200 dark:hover:bg-gray-600 relative transition-colors"
              >
                <Filter className="w-4 h-4" /> Filtres
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={filteredEvents.length === 0}
              >
                <Download className="w-4 h-4" /> Exporter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && view !== "forecast" && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transporteur
              </label>
              <select
                value={filterTransporter}
                onChange={(e) => setFilterTransporter(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {transporterOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Tous">Tous</option>
                <option value="Réception">Réception</option>
                <option value="Expédition">Expédition</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Tous">Tous</option>
                <option value="Prévu">Prévu</option>
                <option value="En cours">En cours</option>
                <option value="Chargé">Chargé</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          {filteredEvents.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Réceptions</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.receptions}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Expéditions</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.expeditions}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Terminés</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.termines}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement du planning...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEvents.length === 0 && view !== "forecast" && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <CalendarIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Aucun événement
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {activeFiltersCount > 0
              ? "Aucun événement ne correspond aux filtres"
              : "Commencez par créer votre premier événement"}
          </p>
          {activeFiltersCount === 0 && (
            <button
              onClick={() => openAddModal()}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer un événement
            </button>
          )}
        </div>
      )}

      {/* Views */}
      {!loading && view === "list" && (
        <PlanningList
          events={filteredEvents}
          onDelete={handleDelete}
          onValidate={handleValidate}
          onReset={handleReset}
          openDocumentsModal={openDocumentsModal}
          onDuplicate={handleDuplicate}
        />
      )}

      {!loading && view === "kanban" && (
        <PlanningKanban
          events={filteredEvents}
          onDelete={handleDelete}
          onValidate={handleUpdateStatusKanban}
        />
      )}

      {!loading && view === "agenda" && (
        <PlanningAgenda
          events={filteredEvents}
          onDelete={handleDelete}
          onValidate={handleValidate}
          onReset={handleReset}
          companyId={companyId || ""}
          onUpdate={handleUpdateEvent}
          onOpenAddModal={openAddModal}
        />
      )}

      {!loading && view === "forecast" && (
        <ForecastView companyId={companyId || ""} />
      )}

      {/* Modal d'ajout/édition */}
      <Dialog open={isOpen} onClose={resetForm} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
              {editingId ? "Modifier l'événement" : "Nouvel événement"}
            </Dialog.Title>

            {saveError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Erreur de validation</p>
                  <p className="text-sm">{saveError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    validationErrors.date ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {validationErrors.date && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Heure *
                </label>
                <input
                  type="time"
                  value={newEvent.hour}
                  onChange={(e) => setNewEvent({ ...newEvent, hour: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    validationErrors.hour ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="Réception">Réception</option>
                <option value="Expédition">Expédition</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transporteur *
              </label>
              <input
                type="text"
                value={newEvent.transporter}
                onChange={(e) => setNewEvent({ ...newEvent, transporter: e.target.value })}
                placeholder="Nom du transporteur"
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                  validationErrors.transporter ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Produits *
              </label>
              <textarea
                value={newEvent.products}
                onChange={(e) => setNewEvent({ ...newEvent, products: e.target.value })}
                placeholder="Description des produits"
                rows={3}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                  validationErrors.products ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Durée (minutes)
              </label>
              <input
                type="number"
                value={newEvent.duration || 30}
                onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })}
                min="15"
                step="15"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                {editingId ? "Mettre à jour" : "Créer"}
              </button>
              <button
                onClick={resetForm}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal Export avec sélection de période */}
      {showExportModal && (
        <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Exporter le planning
              </Dialog.Title>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      setExportStartDate(format(today, 'yyyy-MM-dd'));
                      setExportEndDate(format(today, 'yyyy-MM-dd'));
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const weekStart = new Date(today);
                      weekStart.setDate(today.getDate() - today.getDay() + 1);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      setExportStartDate(format(weekStart, 'yyyy-MM-dd'));
                      setExportEndDate(format(weekEnd, 'yyyy-MM-dd'));
                    }}
                    className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
                  >
                    Cette semaine
                  </button>
                  <button
                    onClick={() => {
                      setExportStartDate("");
                      setExportEndDate("");
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Tout
                  </button>
                </div>

                {(exportStartDate || exportEndDate) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getFilteredPlanningsForExport().length} événement(s) à exporter
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                
                <button
                  onClick={handleExportPDF}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                
                <button
                  onClick={handleSendEmail}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>

              <button
                onClick={() => setShowExportModal(false)}
                className="w-full mt-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Documents Modal */}
      {docPlanningId && (
        <DocumentsModal
          isOpen={isDocModalOpen}
          onClose={closeDocumentsModal}
          planningId={docPlanningId}
          companyId={companyId || ""}
          reloadPlannings={reload}
        />
      )}
    </div>
  );
}