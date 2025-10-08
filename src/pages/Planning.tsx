// src/pages/Planning.tsx
import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, List, Kanban, Plus, Download, Mail, BarChart, Filter } from "lucide-react";
import { Dialog } from "@headlessui/react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import DocumentsModal from "../components/DocumentsModal";

import { useAuth } from "../contexts/AuthContext";
import type { Planning } from "../hooks/usePlannings";
import { usePlannings } from "../hooks/usePlannings";

import PlanningList from "../components/PlanningList";
import PlanningKanban from "../components/PlanningKanban";
import PlanningAgenda from "../components/PlanningAgenda";
import ForecastView from "../components/ForecastView";

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
  const [successMessage, setSuccessMessage] = useState("");

  const [docPlanningId, setDocPlanningId] = useState<string | null>(null);

  const openDocumentsModal = (id: string) => setDocPlanningId(id);
  const closeDocumentsModal = () => setDocPlanningId(null);

  const [newEvent, setNewEvent] = useState<Partial<Planning>>({
    date: "",
    hour: "",
    type: "Réception",
    transporter: "",
    products: "",
    status: "Prévu",
    duration: 30,
  });

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleSave = async () => {
    setSaveError("");

    if (!newEvent.date || !newEvent.hour) {
      setSaveError("La date et l'heure sont obligatoires");
      return;
    }

    if (!newEvent.transporter?.trim()) {
      setSaveError("Le transporteur est obligatoire");
      return;
    }

    try {
      if (editingId) {
        await update(editingId, newEvent);
        showSuccess("Événement modifié avec succès");
      } else {
        await add(newEvent as Omit<Planning, "id">);
        showSuccess("Événement ajouté avec succès");
      }
      resetForm();
    } catch (error) {
      setSaveError("Erreur lors de l'enregistrement");
    }
  };

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
    setIsOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;
    
    try {
      await remove(id);
      showSuccess("Événement supprimé");
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleValidate = async (id: string) => {
    try {
      await update(id, { status: "Terminé" });
      showSuccess("Événement validé");
    } catch (error) {
      alert("Erreur lors de la validation");
    }
  };

  const handleUpdateStatus = async (id: string, updates: Partial<Planning>) => {
    try {
      await update(id, updates);
      showSuccess("Statut mis à jour");
    } catch (error) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleReset = async (id: string) => {
    try {
      await update(id, { status: "Prévu" });
      showSuccess("Événement réinitialisé");
    } catch (error) {
      alert("Erreur lors de la réinitialisation");
    }
  };

  // Pour drag & drop et resize dans l'agenda
  const handleUpdateEvent = async (ev: Planning) => {
    if (!ev.id) {
      alert("Erreur : ID manquant");
      return;
    }

    try {
      await update(ev.id, ev);
      showSuccess("Événement déplacé");
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
      alert("Erreur lors du déplacement");
    }
  };

  const filteredEvents = useMemo(() => {
    return plannings.filter((ev) => {
      return (
        (filterTransporter === "Tous" || ev.transporter === filterTransporter) &&
        (filterType === "Tous" || ev.type === filterType) &&
        (filterStatus === "Tous" || ev.status === filterStatus)
      );
    });
  }, [plannings, filterTransporter, filterType, filterStatus]);

  const transporters = useMemo(() => {
    return [...new Set(plannings.map((ev) => ev.transporter))].filter(Boolean).sort();
  }, [plannings]);

  const escapeCSV = (str: string | undefined) => {
    const value = str || "";
    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      alert("Aucun événement à exporter");
      return;
    }

    const rows = [
      ["Date", "Heure", "Type", "Transporteur", "Produits", "Statut"],
      ...filteredEvents.map(ev => [
        escapeCSV(ev.date),
        escapeCSV(ev.hour),
        escapeCSV(ev.type),
        escapeCSV(ev.transporter),
        escapeCSV(ev.products),
        escapeCSV(ev.status),
      ]),
    ];
    
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows.map(e => e.join(";")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `planning-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    showSuccess(`${filteredEvents.length} événements exportés`);
  };

  const handleSendMail = () => {
    if (filteredEvents.length === 0) {
      alert("Aucun événement à envoyer");
      return;
    }

    if (filteredEvents.length > 20) {
      alert("Trop d'événements pour l'envoi par mail (max 20). Veuillez utiliser l'export CSV.");
      return;
    }

    const subject = `Planning Logistique - ${format(new Date(), "dd/MM/yyyy")}`;
    const body = filteredEvents
      .map(ev =>
        `${ev.date} ${ev.hour} - ${ev.type} - ${ev.transporter} (${ev.products}) [${ev.status}]`
      )
      .join("%0D%0A");

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const resetFilters = () => {
    setFilterTransporter("Tous");
    setFilterType("Tous");
    setFilterStatus("Tous");
  };

  const activeFiltersCount = [filterTransporter, filterType, filterStatus]
    .filter(f => f !== "Tous").length;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Aucun identifiant d'entreprise trouvé. Veuillez vous reconnecter.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {successMessage}
        </div>
      )}

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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition 
                ${view === btn.type
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
                }`}
            >
              <btn.icon className="w-4 h-4" /> {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {view !== "forecast" && (
            <>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-200 relative"
              >
                <Filter className="w-4 h-4" /> Filtres
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow hover:bg-yellow-600"
                disabled={filteredEvents.length === 0}
              >
                <Download className="w-4 h-4" /> Exporter
              </button>
              <button
                onClick={handleSendMail}
                className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-600"
                disabled={filteredEvents.length === 0}
              >
                <Mail className="w-4 h-4" /> Envoyer
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setIsOpen(true);
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </>
          )}
        </div>
      </div>

      {showFilters && view !== "forecast" && (
        <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Filtres</h3>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transporteur
              </label>
              <select
                value={filterTransporter}
                onChange={(e) => setFilterTransporter(e.target.value)}
                className="border rounded-lg p-2 w-full"
              >
                <option>Tous</option>
                {transporters.map((tr) => (
                  <option key={tr}>{tr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded-lg p-2 w-full"
              >
                <option>Tous</option>
                <option>Réception</option>
                <option>Expédition</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-lg p-2 w-full"
              >
                <option>Tous</option>
                <option>Prévu</option>
                <option>Terminé</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600 pt-2 border-t">
            {filteredEvents.length} événement{filteredEvents.length > 1 ? "s" : ""} 
            {activeFiltersCount > 0 && ` (${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""})`}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && view === "list" && (
        <PlanningList
          events={filteredEvents}
          onDelete={handleDelete}
          onValidate={handleValidate}
          onReset={handleReset}
          openDocumentsModal={openDocumentsModal}
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
          add={add}
          companyId={companyId}
          onUpdate={handleUpdateEvent}
        />
      )}

      {!loading && view === "forecast" && <ForecastView companyId={companyId} />}

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              {editingId ? "Modifier" : "Nouvel"} événement
            </Dialog.Title>

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                {saveError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Heure *
              </label>
              <DatePicker
                selected={
                  newEvent.date && newEvent.hour
                    ? new Date(`${newEvent.date}T${newEvent.hour}`)
                    : null
                }
                onChange={(date: Date | null) => {
                  if (date) {
                    const d = format(date, "yyyy-MM-dd");
                    const h = format(date, "HH:mm");
                    setNewEvent({ ...newEvent, date: d, hour: h });
                  }
                }}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={30}
                dateFormat="dd/MM/yyyy HH:mm"
                className="border p-2 w-full rounded"
                placeholderText="Choisir une date et une heure"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                className="border p-2 w-full rounded"
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as "Réception" | "Expédition" })}
              >
                <option value="Réception">Réception</option>
                <option value="Expédition">Expédition</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transporteur *
              </label>
              <input
                className="border p-2 w-full rounded"
                placeholder="Nom du transporteur"
                value={newEvent.transporter}
                onChange={(e) => setNewEvent({ ...newEvent, transporter: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produits
              </label>
              <input
                className="border p-2 w-full rounded"
                placeholder="Description des produits"
                value={newEvent.products}
                onChange={(e) => setNewEvent({ ...newEvent, products: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (minutes)
              </label>
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

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded border hover:bg-gray-50"
              >
                Annuler
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    handleDelete(editingId);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Supprimer
                </button>
              )}
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {editingId ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {docPlanningId && (
        <DocumentsModal
          planningId={docPlanningId}
          isOpen={true}
          onClose={closeDocumentsModal}
          reloadPlannings={reload}
        />
      )}
    </div>
  );
}