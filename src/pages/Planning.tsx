// src/pages/Planning.tsx
import { useState, useMemo } from "react";
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
  Copy
} from "lucide-react";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { useAuth } from "../contexts/AuthContext";
import type { Planning } from "../hooks/usePlannings";
import { usePlannings, PlanningError } from "../hooks/usePlannings";
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

  const { plannings, add, update, remove, loading, reload } = usePlannings(companyId || "");

  const [view, setView] = useState<ViewType>("agenda");
  const [showFilters, setShowFilters] = useState(false);
  const [filterTransporter, setFilterTransporter] = useState<string>("Tous");
  const [filterType, setFilterType] = useState<string>("Tous");
  const [filterStatus, setFilterStatus] = useState<string>("Tous");

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  /**
   * Gestion de l'ouverture/fermeture du modal documents
   */
  const openDocumentsModal = (id: string) => {
    setDocPlanningId(id);
    setIsDocModalOpen(true);
  };
  
  const closeDocumentsModal = () => {
    setDocPlanningId(null);
    setIsDocModalOpen(false);
  };

  /**
   * Ouverture du modal pour créer un événement (depuis Planning ou Agenda)
   */
  const openAddModal = (initialData?: Partial<Planning>) => {
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
  };

  /**
   * Dupliquer un événement
   */
  const handleDuplicate = (event: Planning) => {
    openAddModal({
      date: event.date,
      hour: event.hour,
      type: event.type,
      transporter: event.transporter,
      products: event.products,
      status: "Prévu", // Toujours "Prévu" pour un duplicata
      duration: event.duration || 30,
    });
    toast.info("Événement dupliqué, modifiez les détails si nécessaire");
  };

  /**
   * Sauvegarde avec validation Zod
   */
  const handleSave = async () => {
    setSaveError("");
    setValidationErrors({});

    try {
      // 🔒 Validation du schéma
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

      // 🔒 Validation date/heure (ne pas permettre le passé pour nouveaux événements)
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

      // Enregistrement
      if (editingId) {
        await update(editingId, validation.data);
      } else {
        await add(validation.data as Omit<Planning, "id">);
      }

      resetForm();

    } catch (error) {
      if (error instanceof PlanningError) {
        setSaveError(error.message);
        
        if (error.code === 'VALIDATION_ERROR' && error.details) {
          const errorMap: Record<string, string> = {};
          error.details.forEach((err: any) => {
            errorMap[err.field] = err.message;
          });
          setValidationErrors(errorMap);
        }
      } else {
        setSaveError("Une erreur inattendue s'est produite");
        console.error("Erreur non gérée:", error);
      }
    }
  };

  /**
   * Réinitialisation du formulaire
   */
  const resetForm = () => {
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
  };

  /**
   * Suppression avec confirmation
   */
  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
      return;
    }

    try {
      await remove(id);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  /**
   * Validation (changement de statut à "Terminé")
   */
  const handleValidate = async (id: string) => {
    try {
      await update(id, { status: "Terminé" });
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
    }
  };

  /**
   * Mise à jour de statut (pour Kanban)
   */
  const handleUpdateStatus = async (id: string, updates: Partial<Planning>) => {
    try {
      await update(id, updates);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  /**
   * Réinitialisation du statut
   */
  const handleReset = async (id: string) => {
    try {
      await update(id, { status: "Prévu" });
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
    }
  };

  /**
   * Mise à jour générique (drag & drop dans l'agenda)
   */
  const handleUpdateEvent = async (ev: Planning) => {
    if (!ev.id) {
      toast.error("Erreur : ID manquant");
      return;
    }

    try {
      await update(ev.id, ev);
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
    }
  };

  /**
   * Filtrage des événements
   */
  const filteredEvents = useMemo(() => {
    return plannings.filter((ev) => {
      return (
        (filterTransporter === "Tous" || ev.transporter === filterTransporter) &&
        (filterType === "Tous" || ev.type === filterType) &&
        (filterStatus === "Tous" || ev.status === filterStatus)
      );
    });
  }, [plannings, filterTransporter, filterType, filterStatus]);

  /**
   * Liste unique des transporteurs
   */
  const transporters = useMemo(() => {
    return [...new Set(plannings.map((ev) => ev.transporter))].filter(Boolean).sort();
  }, [plannings]);

  /**
   * Nombre de filtres actifs
   */
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterTransporter !== "Tous") count++;
    if (filterType !== "Tous") count++;
    if (filterStatus !== "Tous") count++;
    return count;
  }, [filterTransporter, filterType, filterStatus]);

  /**
   * Export CSV
   */
  const escapeCSV = (str: string | undefined) => {
    const value = str || "";
    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      toast.warning("Aucun événement à exporter");
      return;
    }

    const headers = "Date;Heure;Type;Transporteur;Produits;Statut;Durée (min)";
    const rows = filteredEvents.map((ev) => {
      return [
        escapeCSV(ev.date),
        escapeCSV(ev.hour),
        escapeCSV(ev.type),
        escapeCSV(ev.transporter),
        escapeCSV(ev.products),
        escapeCSV(ev.status),
        escapeCSV(ev.duration?.toString() || "30"),
      ].join(";");
    });

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planning_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Export CSV réussi");
  };

  /**
   * Génération du PDF
   */
  const generatePDF = () => {
    if (filteredEvents.length === 0) {
      toast.warning("Aucun événement à exporter");
      return null;
    }

    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(18);
    doc.text("Planning", 14, 20);
    doc.setFontSize(11);
    doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm")}`, 14, 28);
    
    // Tableau
    const tableData = filteredEvents.map(ev => [
      ev.date,
      ev.hour,
      ev.type,
      ev.transporter,
      ev.products || "-",
      ev.status,
      `${ev.duration || 30} min`
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [["Date", "Heure", "Type", "Transporteur", "Produits", "Statut", "Durée"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    return doc;
  };

  /**
   * Export PDF simple
   */
  const handleExportPDF = () => {
    const doc = generatePDF();
    if (doc) {
      doc.save(`planning_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF réussi");
    }
  };

  /**
   * Envoi par email avec PDF en pièce jointe
   */
  const handleSendMail = () => {
    const doc = generatePDF();
    if (!doc) return;

    // Convertir le PDF en base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    const subject = encodeURIComponent(`Planning du ${format(new Date(), "dd/MM/yyyy")}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint le planning du ${format(new Date(), "dd/MM/yyyy")}.\n\n` +
      `Résumé :\n` +
      `- Total d'événements : ${filteredEvents.length}\n` +
      `- Réceptions : ${filteredEvents.filter(e => e.type === "Réception").length}\n` +
      `- Expéditions : ${filteredEvents.filter(e => e.type === "Expédition").length}\n\n` +
      `Cordialement`
    );

    // Note: Malheureusement, les clients mail ne supportent pas les pièces jointes via mailto
    // Solution : Télécharger le PDF et demander à l'utilisateur de l'attacher
    doc.save(`planning_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    
    toast.info("PDF téléchargé ! Veuillez l'attacher à votre email.", { duration: 5000 });
    
    // Ouvrir le client mail avec le contenu pré-rempli
    setTimeout(() => {
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }, 500);
  };

  /**
   * Reset tous les filtres
   */
  const handleResetFilters = () => {
    setFilterTransporter("Tous");
    setFilterType("Tous");
    setFilterStatus("Tous");
    setShowFilters(false);
  };

  /**
   * Gestion du chargement et de l'authentification
   */
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Erreur d'authentification</h2>
          <p className="text-gray-600 mt-2">Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* En-tête avec sélection de vue */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { type: "list", label: "Liste", icon: List },
            { type: "kanban", label: "Kanban", icon: Kanban },
            { type: "agenda", label: "Agenda", icon: CalendarIcon },
            { type: "forecast", label: "Prévisions", icon: BarChart },
          ].map((btn) => (
            <button
              key={btn.type}
              onClick={() => setView(btn.type as ViewType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-all duration-200
                ${view === btn.type
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-white border border-gray-300 hover:bg-gray-50 hover:border-blue-300"
                }`}
            >
              <btn.icon className="w-4 h-4" /> {btn.label}
            </button>
          ))}
        </div>

        {/* Boutons d'actions */}
        <div className="flex flex-wrap gap-2">
          {view !== "forecast" && (
            <>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-200 relative transition-colors"
              >
                <Filter className="w-4 h-4" /> Filtres
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredEvents.length === 0}
              >
                <Download className="w-4 h-4" /> CSV
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredEvents.length === 0}
              >
                <Download className="w-4 h-4" /> PDF
              </button>

              <button
                onClick={handleSendMail}
                className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredEvents.length === 0}
              >
                <Mail className="w-4 h-4" /> Email + PDF
              </button>

              <button
                onClick={() => openAddModal()}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Panneau des filtres */}
      {showFilters && view !== "forecast" && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtre Transporteur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transporteur
              </label>
              <select
                value={filterTransporter}
                onChange={(e) => setFilterTransporter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Tous">Tous</option>
                {transporters.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Tous">Tous</option>
                <option value="Réception">Réception</option>
                <option value="Expédition">Expédition</option>
              </select>
            </div>

            {/* Filtre Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Tous">Tous</option>
                <option value="Prévu">Prévu</option>
                <option value="En cours">En cours</option>
                <option value="Chargé">Chargé</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
          </div>

          {/* Résumé des filtres actifs */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Filtres actifs :</span>
                {filterTransporter !== "Tous" && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {filterTransporter}
                  </span>
                )}
                {filterType !== "Tous" && (
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    {filterType}
                  </span>
                )}
                {filterStatus !== "Tous" && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                    {filterStatus}
                  </span>
                )}
                <span className="text-gray-500">
                  ({filteredEvents.length} événement{filteredEvents.length > 1 ? "s" : ""})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenu principal - Vues */}
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
          onValidate={handleUpdateStatus}
        />
      )}

      {!loading && view === "agenda" && (
        <PlanningAgenda
          events={filteredEvents}
          onDelete={handleDelete}
          onValidate={handleValidate}
          onReset={handleReset}
          companyId={companyId}
          onUpdate={handleUpdateEvent}
          onOpenAddModal={openAddModal}
        />
      )}

      {!loading && view === "forecast" && (
        <ForecastView companyId={companyId} />
      )}

      {/* Modal d'ajout/édition */}
      <Dialog open={isOpen} onClose={resetForm} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              {editingId ? "Modifier l'événement" : "Nouvel événement"}
            </Dialog.Title>

            {/* Affichage des erreurs globales */}
            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Erreur de validation</p>
                  <p className="text-sm">{saveError}</p>
                </div>
              </div>
            )}

            {/* Date et Heure */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {validationErrors.date && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure *
                </label>
                <input
                  type="time"
                  value={newEvent.hour}
                  onChange={(e) => setNewEvent({ ...newEvent, hour: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.hour ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {validationErrors.hour && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.hour}</p>
                )}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as "Réception" | "Expédition" })}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.type ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="Réception">Réception</option>
                <option value="Expédition">Expédition</option>
              </select>
              {validationErrors.type && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.type}</p>
              )}
            </div>

            {/* Transporteur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transporteur *
              </label>
              <input
                type="text"
                value={newEvent.transporter}
                onChange={(e) => setNewEvent({ ...newEvent, transporter: e.target.value })}
                placeholder="Ex: DHL, Chronopost, Geodis..."
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.transporter ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {validationErrors.transporter && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.transporter}</p>
              )}
            </div>

            {/* Produits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produits
              </label>
              <textarea
                value={newEvent.products || ""}
                onChange={(e) => setNewEvent({ ...newEvent, products: e.target.value })}
                placeholder="Description des produits (optionnel)"
                rows={3}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  validationErrors.products ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {validationErrors.products && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.products}</p>
              )}
            </div>

            {/* Statut et Durée */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  value={newEvent.status}
                  onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value as any })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.status ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="Prévu">Prévu</option>
                  <option value="En cours">En cours</option>
                  <option value="Chargé">Chargé</option>
                  <option value="Terminé">Terminé</option>
                </select>
                {validationErrors.status && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.status}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée (min)
                </label>
                <input
                  type="number"
                  value={newEvent.duration}
                  onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) || 30 })}
                  min="1"
                  max="480"
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.duration ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {validationErrors.duration && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.duration}</p>
                )}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
              >
                {editingId ? "Modifier" : "Créer"}
              </button>
              <button
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal Documents */}
      {docPlanningId && isDocModalOpen && (
        <DocumentsModal
          planningId={docPlanningId}
          companyId={companyId || ""}
          isOpen={isDocModalOpen}
          onClose={closeDocumentsModal}
          reloadPlannings={reload}
        />
      )}
    </div>
  );
}