// src/pages/Planning.tsx - VERSION COMPLÈTE AVEC KANBAN 10/10 INTÉGRÉ
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
  Warehouse,
} from "lucide-react";
import { Dialog } from "@headlessui/react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { useAuth } from "../contexts/AuthContext";
import type { Planning } from "../hooks/useOptimizedPlannings";
import { useOptimizedPlannings } from "../hooks/useOptimizedPlannings";
import { usePlanningsWithDocks } from "../hooks/usePlanningsWithDocks";
import { useDocks } from "../hooks/useDocks";
import { validatePlanning, validateEventDateTime } from "../schemas/planningSchema";
import { supabase } from "../supabaseClient";

import PlanningList from "../components/PlanningList";
import PlanningKanban from "../components/PlanningKanban";
import PlanningAgenda from "../components/PlanningAgenda";
import ForecastView from "../components/ForecastView";
import DocumentsModal from "../components/DocumentsModal";
import DockAssignModal from "../components/DockAssignModal";

type ViewType = "list" | "kanban" | "agenda" | "forecast";

export default function Planning() {
  const { user, isLoading: authLoading } = useAuth();
  const companyId = user?.company_id ?? null;

  const { plannings, add, update, remove, loading, reload } = useOptimizedPlannings(
    companyId,
    { forecastOnly: false, enableRealtime: true }
  );

  const { plannings: planningsWithDocks, loading: docksLoading, refresh: refreshDocks } = usePlanningsWithDocks(companyId);

  const { docks } = useDocks(companyId);

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

  const [view, setView] = useState<ViewType>("kanban");
  const [showFilters, setShowFilters] = useState(false);
  const [filterTransporter, setFilterTransporter] = useState<string>("Tous");
  const [filterType, setFilterType] = useState<string>("Tous");
  const [filterStatus, setFilterStatus] = useState<string>("Tous");
  const [showDocks, setShowDocks] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const [docPlanningId, setDocPlanningId] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // ✅ États pour le modal d'assignation de quai
  const [dockAssignModalOpen, setDockAssignModalOpen] = useState(false);
  const [assigningPlanningId, setAssigningPlanningId] = useState<string | null>(null);

  const [newEvent, setNewEvent] = useState<Partial<Planning>>({
    date: "",
    hour: "",
    type: "Réception",
    transporter: "",
    products: "",
    status: "Prévu",
    duration: 30,
    dock_booking_id: null,
  });

  // ============================================================
  // HANDLERS DE BASE
  // ============================================================

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
      // Retirer l'id pour éviter les éditions accidentelles lors de la duplication
      const { id, ...dataWithoutId } = initialData;
      setNewEvent(dataWithoutId);
      setEditingId(null); // Toujours null car c'est soit un nouvel événement, soit une duplication
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
      dock_booking_id: null,
    });
    setSaveError("");
    setValidationErrors({});
  }, []);

  // Fonction pour assigner un quai à un planning
  const handleDockAssignment = useCallback(async (planningId: string, dockId: string) => {
    try {
      const planning = enrichedPlannings.find(p => p.id === planningId);
      if (!planning) return;

      const slotStart = `${planning.date}T${planning.hour}:00`;
      const slotEnd = new Date(new Date(slotStart).getTime() + (planning.duration || 30) * 60000).toISOString();
      
      const bookingType: 'loading' | 'unloading' = 
        planning.type === 'Réception' ? 'unloading' : 'loading';

      // Créer la réservation de quai
      const { data: bookingData, error: bookingError } = await supabase
        .from('dock_bookings')
        .insert({
          company_id: companyId,
          dock_id: dockId,
          slot_start: slotStart,
          slot_end: slotEnd,
          type: bookingType,
          transporter_name: planning.transporter,
          status: 'confirmed' as const,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Lier au planning
      const { error: linkError } = await supabase
        .from('plannings')
        .update({ dock_booking_id: bookingData.id })
        .eq('id', planningId);

      if (linkError) throw linkError;

    } catch (err: any) {
      console.error('Erreur assignation quai:', err);
      toast.error('Impossible d\'assigner le quai');
    }
  }, [companyId, enrichedPlannings]);

  // Fonction pour retirer un quai
  const removeDockAssignment = useCallback(async (planningId: string) => {
    try {
      const planning = enrichedPlannings.find(p => p.id === planningId);
      if (!planning?.dock_booking_id) return;

      // Supprimer la réservation
      const { error: deleteError } = await supabase
        .from('dock_bookings')
        .delete()
        .eq('id', planning.dock_booking_id);

      if (deleteError) throw deleteError;

      // Mettre à jour le planning
      const { error: updateError } = await supabase
        .from('plannings')
        .update({ dock_booking_id: null })
        .eq('id', planningId);

      if (updateError) throw updateError;

    } catch (err: any) {
      console.error('Erreur retrait quai:', err);
      toast.error('Impossible de retirer le quai');
    }
  }, [enrichedPlannings]);

  const handleSave = useCallback(async () => {
    if (!companyId || !user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setSaveError("");
    setValidationErrors({});

    try {
      // Validation des champs requis
      if (!newEvent.date || !newEvent.hour) {
        setSaveError("Date et heure sont obligatoires");
        return;
      }

      // Validation des dates/heures
      // ✅ Permettre les dates passées en mode édition (editingId existe)
      const dateTimeValidation = validateEventDateTime(
        newEvent.date, 
        newEvent.hour, 
        !!editingId // allowPast = true si on modifie un événement existant
      );
      if (!dateTimeValidation.success) {
        // validateEventDateTime retourne juste { success: false, message: string }
        setSaveError(dateTimeValidation.message);
        return;
      }

      // Validation complète
      const validation = validatePlanning({
        ...newEvent,
        company_id: companyId,
        user_id: user.id,
        is_forecast: false,
      });

      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.errors.forEach(err => {
          errors[err.field] = err.message;
        });
        setValidationErrors(errors);
        toast.error("Veuillez corriger les erreurs de saisie");
        return;
      }

      const cleanedData = {
        company_id: companyId,
        user_id: user.id,
        date: validation.data.date,
        hour: validation.data.hour,
        type: validation.data.type,
        transporter: validation.data.transporter,
        status: validation.data.status,
        is_forecast: false,
        duration: validation.data.duration ?? 30,
        products: validation.data.products ?? null,
        name: validation.data.name ?? null,
      };

      if (editingId) {
        await update(editingId, cleanedData);
        
        // ✅ Gérer l'assignation du quai séparément
        const currentPlanning = enrichedPlannings.find(p => p.id === editingId);
        const currentDockId = currentPlanning?.dock_booking_id;
        const newDockId = newEvent.dock_booking_id;
        
        if (newDockId && newDockId !== '' && newDockId !== currentDockId) {
          // Retirer l'ancien quai si existant
          if (currentDockId) {
            await removeDockAssignment(editingId);
          }
          // Assigner le nouveau quai
          await handleDockAssignment(editingId, newDockId);
        } else if (!newDockId && currentDockId) {
          // Retirer le quai si désélectionné
          await removeDockAssignment(editingId);
        }
        
        toast.success("Événement modifié avec succès");
      } else {
        const newPlanning = await add(cleanedData);
        
        // ✅ Assigner le quai si sélectionné
        if (newPlanning && newEvent.dock_booking_id) {
          await handleDockAssignment((newPlanning as any).id, newEvent.dock_booking_id);
        }
        
        toast.success("Événement créé avec succès");
      }
  
      // ✅ FORCER LA FERMETURE DU MODAL IMMÉDIATEMENT
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
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      const errorMsg = error?.message || "Une erreur est survenue";
      setSaveError(errorMsg);
      toast.error(errorMsg);
    }
  }, [newEvent, editingId, user, companyId, add, update]);

  const handleDuplicate = useCallback((planning: Planning) => {
    openAddModal({
      ...planning,
      id: undefined,
      name: `${planning.name || planning.transporter} (copie)`,
    });
    toast.info("Événement dupliqué, modifiez les détails puis enregistrez");
  }, [openAddModal]);

  const handleDelete = useCallback(async (id: string) => {
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

  // ✅ Filtrer les quais disponibles selon le type d'événement
  const availableDocks = useMemo(() => {
    if (!newEvent.type) return [];
    
    return docks.filter(dock => {
      if (newEvent.type === 'Réception') {
        return dock.type === 'unloading' || dock.type === 'both';
      } else {
        return dock.type === 'loading' || dock.type === 'both';
      }
    }).filter(dock => dock.status === 'available');
  }, [docks, newEvent.type]);

  // ✅ Handler pour assigner un quai (ouvre le modal d'assignation)
  const handleAssignDock = useCallback((eventId: string) => {
    setAssigningPlanningId(eventId);
    setDockAssignModalOpen(true);
  }, []);

  // ✅ Fermer le modal d'assignation de quai
  const closeDockAssignModal = useCallback(() => {
    setAssigningPlanningId(null);
    setDockAssignModalOpen(false);
  }, []);

  // ✅ Fonction pour recharger TOUTES les données (plannings + quais)
  const reloadAll = useCallback(async () => {
    await Promise.all([
      reload(),
      refreshDocks()
    ]);
  }, [reload, refreshDocks]);

  // ✅ Récupérer l'événement sélectionné pour l'assignation de quai
  const selectedPlanningForDock = useMemo(() => {
    if (!assigningPlanningId) return null;
    return enrichedPlannings.find(p => p.id === assigningPlanningId);
  }, [assigningPlanningId, enrichedPlannings]);

  // ✅ Handler pour éditer un événement depuis le Kanban
  const handleEdit = useCallback((planning: Planning) => {
    setNewEvent({
      ...planning,
      dock_booking_id: planning.dock_booking_id || null,
    });
    setEditingId(planning.id);
    setSaveError("");
    setValidationErrors({});
    setIsOpen(true);
  }, []);

  // ✅ NOUVEAU - Handler pour ajout rapide depuis le Kanban
  const handleQuickAdd = useCallback((date: string) => {
    openAddModal({
      date,
      hour: "08:00",
      type: "Réception",
      transporter: "",
      products: "",
      status: "Prévu",
      duration: 30,
    });
  }, [openAddModal]);

  // ============================================================
  // FILTRES ET STATS
  // ============================================================

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

  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const receptions = filteredEvents.filter((e) => e.type === "Réception").length;
    const expeditions = filteredEvents.filter((e) => e.type === "Expédition").length;
    const termines = filteredEvents.filter((e) => e.status === "Terminé").length;
    return { total, receptions, expeditions, termines };
  }, [filteredEvents]);

  // ============================================================
  // EXPORT
  // ============================================================

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

  // ============================================================
  // RENDU
  // ============================================================

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
          {/* Toggle Afficher les quais */}
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
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transporteur
              </label>
              <select
                value={filterTransporter}
                onChange={(e) => setFilterTransporter(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {transporterOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Tous">Tous</option>
                <option value="Prévu">Prévu</option>
                <option value="En cours">En cours</option>
                <option value="Chargé">Chargé</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
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
          onAssignDock={handleAssignDock}
          showDocks={showDocks}
        />
      )}

      {!loading && view === "kanban" && (
        <PlanningKanban
          events={filteredEvents}
          onDelete={handleDelete}
          onValidate={handleUpdateStatusKanban}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onAssignDock={handleAssignDock}
          onQuickAdd={handleQuickAdd}
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
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newEvent.date || ""}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className={`w-full border ${
                      validationErrors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                  />
                  {validationErrors.date && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.date}</p>
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
                    className={`w-full border ${
                      validationErrors.hour ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                  />
                  {validationErrors.hour && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.hour}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  value={newEvent.type}
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
                  placeholder="Ex: DHL, Chronopost..."
                  className={`w-full border ${
                    validationErrors.transporter ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
                />
                {validationErrors.transporter && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.transporter}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Produits
                </label>
                <textarea
                  value={newEvent.products || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, products: e.target.value })}
                  placeholder="Description des produits..."
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Durée (min)
                  </label>
                  <input
                    type="number"
                    value={newEvent.duration || 30}
                    onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) || 30 })}
                    min="1"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Statut
                  </label>
                  <select
                    value={newEvent.status}
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

                <div className="flex flex-wrap gap-2 mt-3">
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
                      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
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
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal Documents */}
      {docPlanningId && (
        <DocumentsModal
          planningId={docPlanningId}
          companyId={companyId || ""}
          isOpen={isDocModalOpen}
          onClose={closeDocumentsModal}
          reloadPlannings={reload}
        />
      )}

      {/* Modal Assignation de Quai */}
      {selectedPlanningForDock && (
        <DockAssignModal
          isOpen={dockAssignModalOpen}
          onClose={closeDockAssignModal}
          planning={selectedPlanningForDock}
          companyId={companyId || ''}
          onSuccess={() => {
            reloadAll(); // ✅ Recharger plannings ET quais
            closeDockAssignModal();
          }}
        />
      )}
    </div>
  );
}