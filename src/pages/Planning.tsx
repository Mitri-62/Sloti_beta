// src/pages/Planning.tsx - IMPORTS COMPLETS
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
  Warehouse, // ✅ AJOUTÉ
} from "lucide-react";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { useAuth } from "../contexts/AuthContext";
import type { Planning } from "../hooks/useOptimizedPlannings"; // ✅ UN SEUL IMPORT DE Planning
import { useOptimizedPlannings } from "../hooks/useOptimizedPlannings";
import { usePlanningsWithDocks } from "../hooks/usePlanningsWithDocks"; // ✅ AJOUTÉ
import { validatePlanning, validateEventDateTime } from "../schemas/planningSchema";

import PlanningList from "../components/PlanningList";
import PlanningKanban from "../components/PlanningKanban";
import PlanningAgenda from "../components/PlanningAgenda";
import ForecastView from "../components/ForecastView";
import DocumentsModal from "../components/DocumentsModal";

type ViewType = "list" | "kanban" | "agenda" | "forecast";

export default function Planning() {
  const { user, isLoading: authLoading } = useAuth();
  const companyId = user?.company_id ?? null;

  const { plannings, add, update, remove, loading, reload } = useOptimizedPlannings(
    companyId,
    { forecastOnly: false, enableRealtime: true }
  );

  // ✅ AJOUTÉ - Hook pour récupérer les quais
  const { plannings: planningsWithDocks, loading: docksLoading } = usePlanningsWithDocks(companyId);

  // ✅ AJOUTÉ - Fusionner les données de planning avec les quais
  const enrichedPlannings = useMemo(() => {
    if (docksLoading) return plannings;
    
    return plannings.map(planning => {
      const withDock = planningsWithDocks.find(p => p.id === planning.id);
      return {
        ...planning,
        dock_booking: withDock?.dock_booking || null,
        dock_booking_id: withDock?.dock_booking_id || null
      };
    });
  }, [plannings, planningsWithDocks, docksLoading]);

  const [view, setView] = useState<ViewType>("agenda");
  const [showFilters, setShowFilters] = useState(false);
  const [filterTransporter, setFilterTransporter] = useState<string>("Tous");
  const [filterType, setFilterType] = useState<string>("Tous");
  const [filterStatus, setFilterStatus] = useState<string>("Tous");
  const [showDocks, setShowDocks] = useState(true); // ✅ AJOUTÉ

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

  const openDocumentsModal = useCallback((id: string) => {
    setDocPlanningId(id);
    setIsDocModalOpen(true);
  }, []);
  
  const closeDocumentsModal = useCallback(() => {
    setDocPlanningId(null);
    setIsDocModalOpen(false);
  }, []);

  const openAddModal = useCallback((initialData?: Partial<Planning>) => {
    if (initialData) {
      setNewEvent(initialData);
      setEditingId(initialData.id || null);
    } else {
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
    }
    setSaveError("");
    setValidationErrors({});
    setIsOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
    setNewEvent({
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
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaveError("");
      setValidationErrors({});
  
      // Validation des champs requis
      if (!newEvent.date || !newEvent.hour || !newEvent.type || !newEvent.transporter) {
        setSaveError("Veuillez remplir tous les champs obligatoires");
        return;
      }
  
      // Validation date/heure
      const eventDateTime = validateEventDateTime(newEvent.date, newEvent.hour);
      if (!eventDateTime.success) {
        setSaveError(eventDateTime.message); // ✅ CORRIGÉ
        return;
      }
  
      // ✅ Structure complète avec TOUTES les propriétés
      const planningData = {
        date: newEvent.date,
        hour: newEvent.hour,
        type: newEvent.type as "Réception" | "Expédition",
        transporter: newEvent.transporter,
        products: newEvent.products || null,
        status: (newEvent.status || "Prévu") as "Prévu" | "En cours" | "Chargé" | "Terminé",
        duration: newEvent.duration || 30,
        name: newEvent.name || null,
        user_id: user?.id || null,
        is_forecast: false,
      };
  
      // Validation avec Zod
      const validation = validatePlanning(planningData);
      if (!validation.success) {
        // ✅ Convertir le tableau d'erreurs en objet
        const errorsObject = validation.errors.reduce((acc, err) => {
          acc[err.field] = err.message;
          return acc;
        }, {} as Record<string, string>);
        
        setValidationErrors(errorsObject);
        setSaveError("Veuillez corriger les erreurs");
        return;
      }
  
      // ✅ Nettoyer les données pour éliminer undefined
      const cleanedData = {
        ...validation.data,
        user_id: validation.data.user_id ?? null,
        products: validation.data.products ?? null,
        name: validation.data.name ?? null,
      };

      // Sauvegarde
      if (editingId) {
        await update(editingId, cleanedData);
        toast.success("Événement modifié avec succès");
      } else {
        await add(cleanedData);
        toast.success("Événement créé avec succès");
      }
  
      resetForm();
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      const errorMsg = error?.message || "Une erreur est survenue"; // ✅ CORRIGÉ
      setSaveError(errorMsg);
      toast.error(errorMsg);
    }
  }, [newEvent, editingId, user, add, update, resetForm]);

  const handleDuplicate = useCallback((planning: Planning) => {
    openAddModal({
      ...planning,
      id: undefined,
      name: `${planning.name || planning.transporter} (copie)`,
    });
  }, [openAddModal]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) 
      return;
    
    try {
      await remove(id);
    } catch (error) {
      // Erreur déjà gérée par le hook
    }
  }, [remove]);

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

  const filteredEvents = useMemo(() => {
    return enrichedPlannings.filter((ev) => {
      if (filterTransporter !== "Tous" && ev.transporter !== filterTransporter) return false;
      if (filterType !== "Tous" && ev.type !== filterType) return false;
      if (filterStatus !== "Tous" && ev.status !== filterStatus) return false;
      return true;
    });
  }, [enrichedPlannings, filterTransporter, filterType, filterStatus]);

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

  const getFilteredPlanningsForExport = useCallback(() => {
    if (!exportStartDate || !exportEndDate) {
      return filteredEvents;
    }
    
    return filteredEvents.filter(planning => {
      return planning.date >= exportStartDate && planning.date <= exportEndDate;
    });
  }, [filteredEvents, exportStartDate, exportEndDate]);

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

  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const receptions = filteredEvents.filter((e) => e.type === "Réception").length;
    const expeditions = filteredEvents.filter((e) => e.type === "Expédition").length;
    const termines = filteredEvents.filter((e) => e.status === "Terminé").length;
    return { total, receptions, expeditions, termines };
  }, [filteredEvents]);

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

  const viewButtons = [
    { view: "list" as ViewType, icon: List, label: "Liste" },
    { view: "kanban" as ViewType, icon: Kanban, label: "Kanban" },
    { view: "agenda" as ViewType, icon: CalendarIcon, label: "Agenda" },
    { view: "forecast" as ViewType, icon: BarChart, label: "Prévisions" },
  ];

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen planning-container">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 planning-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Planning</h1>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* ✅ AJOUTÉ - Toggle Afficher les quais */}
          <label className="flex items-center gap-2 text-sm cursor-pointer bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <input
              type="checkbox"
              checked={showDocks}
              onChange={(e) => setShowDocks(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Warehouse className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
              Afficher les quais
            </span>
          </label>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm font-medium">Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm font-medium">Exporter</span>
          </button>

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm font-medium">Nouvel événement</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 planning-view-tabs">
        {viewButtons.map(({ view: v, icon: Icon, label }) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              view === v
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">{label}</span>
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow planning-filters-panel">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filtres</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 planning-stats-grid">
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
          showDocks={showDocks}
        />
      )}

      {!loading && view === "kanban" && (
        <PlanningKanban
          events={filteredEvents}
          onDelete={handleDelete}
          onValidate={handleUpdateStatusKanban}
          showDocks={showDocks}
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
          showDocks={showDocks}
        />
      )}

      {!loading && view === "forecast" && (
        <ForecastView companyId={companyId || ""} />
      )}

      {/* Modal d'ajout/édition */}
      <Dialog open={isOpen} onClose={resetForm} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto planning-modal-content">
            <Dialog.Title className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {editingId ? "Modifier l'événement" : "Nouvel événement"}
            </Dialog.Title>

            {saveError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
                {saveError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {validationErrors.date && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Heure *
                </label>
                <input
                  type="time"
                  value={newEvent.hour || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, hour: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.hour ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {validationErrors.hour && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.hour}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={newEvent.duration || 30}
                  onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) || 30 })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  value={newEvent.type || "Réception"}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as "Réception" | "Expédition" })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                  value={newEvent.transporter || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, transporter: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.transporter ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Nom du transporteur"
                />
                {validationErrors.transporter && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.transporter}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom / Référence
                </label>
                <input
                  type="text"
                  value={newEvent.name || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Optionnel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Produits
                </label>
                <textarea
                  value={newEvent.products || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, products: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description des produits"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Statut
                </label>
                <select
                  value={newEvent.status || "Prévu"}
                  onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value as Planning["status"] })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Prévu">Prévu</option>
                  <option value="En cours">En cours</option>
                  <option value="Chargé">Chargé</option>
                  <option value="Terminé">Terminé</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={resetForm}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {editingId ? "Modifier" : "Créer"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal Export */}
      <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
              Exporter le planning
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Période (optionnel)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Du</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Au</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => {
                      const today = new Date();
                      setExportStartDate(format(today, 'yyyy-MM-dd'));
                      setExportEndDate(format(today, 'yyyy-MM-dd'));
                    }}
                    className="flex-1 min-w-[80px] px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
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
                    className="flex-1 min-w-[80px] px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
                  >
                    Cette semaine
                  </button>
                  <button
                    onClick={() => {
                      setExportStartDate("");
                      setExportEndDate("");
                    }}
                    className="flex-1 min-w-[80px] px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Tout
                  </button>
                </div>

                {(exportStartDate || exportEndDate) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {getFilteredPlanningsForExport().length} événement(s) à exporter
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  PDF
                </button>
                <button
                  onClick={handleSendEmail}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Fermer
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal Documents */}
      {isDocModalOpen && docPlanningId && (
        <DocumentsModal
          isOpen={isDocModalOpen}
          onClose={closeDocumentsModal}
          planningId={docPlanningId}
          companyId={companyId || ""}
          reloadPlannings={reload} // ✅ AJOUTE CETTE LIGNE
        />
      )}
    </div>
  );
}