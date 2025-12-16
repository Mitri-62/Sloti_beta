import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Dialog } from "@headlessui/react";
import { useAuth } from "../contexts/AuthContext";
import { X, Upload, Trash2, FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface DocumentsModalProps {
  planningId: string;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  reloadPlannings: () => void;
}

interface Document {
  id: string;
  name: string;
  path: string;
  type: string;
  created_at: string;
  signed_url?: string;
}

export default function DocumentsModal({ planningId, isOpen, onClose, reloadPlannings }: DocumentsModalProps) {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;

  const [docs, setDocs] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (planningId && isOpen) loadDocs();
  }, [planningId, isOpen]);

  const loadDocs = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("planning_id", planningId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // ✅ Générer des URLs signées pour chaque document (expire après 1h)
      const docsWithSignedUrls = await Promise.all(
        (data || []).map(async (doc) => {
          const { data: signedData } = await supabase.storage
            .from("documents")
            .createSignedUrl(doc.path, 3600); // 1 heure

          return {
            ...doc,
            signed_url: signedData?.signedUrl || null
          };
        })
      );

      setDocs(docsWithSignedUrls);
    } catch (error) {
      console.error("Erreur chargement documents:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const sanitizeFileName = (name: string) => {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  };

  const handleUpload = async () => {
    if (!file || !companyId) return;

    setUploading(true);
    try {
      const cleanName = sanitizeFileName(file.name);
      const filePath = `${companyId}/${planningId}/${Date.now()}_${cleanName}`;

      // ✅ Upload dans le bucket
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ✅ Insert dans la table (sans stocker l'URL publique)
      const { error: insertError } = await supabase.from("documents").insert([
        {
          company_id: companyId,
          planning_id: planningId,
          name: file.name,
          path: filePath,
          type: "BL",
        },
      ]);

      if (insertError) throw insertError;

      toast.success("Document ajouté avec succès");
      setFile(null);
      await loadDocs();
      reloadPlannings();
    } catch (error: any) {
      console.error("Erreur upload:", error);
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Supprimer ce document ?")) return;

    try {
      await supabase.from("documents").delete().eq("id", id);
      await supabase.storage.from("documents").remove([path]);
      
      toast.success("Document supprimé");
      await loadDocs();
      reloadPlannings();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleOpenDocument = async (doc: Document) => {
    // ✅ Générer une nouvelle URL signée au clic (plus sécurisé)
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.path, 300); // 5 minutes

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Impossible d'ouvrir le document");
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Documents liés
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Upload zone */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <input
                type="file"
                id="file-upload"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {file ? file.name : "Cliquez pour sélectionner un fichier"}
                </span>
              </label>
            </div>

            {file && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Ajouter le document
                  </>
                )}
              </button>
            )}

            {/* Documents list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun document</p>
                </div>
              ) : (
                docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group"
                  >
                    <button
                      onClick={() => handleOpenDocument(doc)}
                      className="flex items-center gap-2 text-left flex-1 min-w-0 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate text-sm text-gray-900 dark:text-white">
                        {doc.name}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.path)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}