import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Dialog } from "@headlessui/react";
import { useAuth } from "../contexts/AuthContext";

interface DocumentsModalProps {
  planningId: string;
  isOpen: boolean;
  onClose: () => void;
  reloadPlannings: () => void; // ✅ nouveau prop
}

export default function DocumentsModal({ planningId, isOpen, onClose, reloadPlannings }: DocumentsModalProps) {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;

  const [docs, setDocs] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (planningId) loadDocs();
  }, [planningId]);

  const loadDocs = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("planning_id", planningId)
      .eq("company_id", companyId);

    if (!error && data) setDocs(data);
  };

  const sanitizeFileName = (name: string) => {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  };

  const handleUpload = async () => {
    if (!file || !companyId) return;

    const cleanName = sanitizeFileName(file.name);
    const filePath = `${planningId}/${Date.now()}_${cleanName}`;

    // ✅ Upload dans le bucket
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      alert("❌ Erreur upload: " + uploadError.message);
      console.error(uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    // ✅ Insert dans la table
    const { error: insertError } = await supabase.from("documents").insert([
      {
        company_id: companyId,
        planning_id: planningId,
        name: file.name,
        path: filePath,
        url: urlData.publicUrl,
        type: "BL",
      },
    ]);

    if (insertError) {
      console.error("❌ Insert error:", insertError);
    }

    setFile(null);
    await loadDocs();
    reloadPlannings(); // ✅ met à jour la vue liste
  };

  const handleDelete = async (id: string, path: string) => {
    await supabase.from("documents").delete().eq("id", id);
    await supabase.storage.from("documents").remove([path]);
    await loadDocs();
    reloadPlannings(); // ✅ met à jour la vue liste
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg w-96 space-y-4">
          <h2 className="font-semibold">📎 Documents liés</h2>

          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            ➕ Ajouter
          </button>

          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex justify-between items-center">
                <a href={d.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {d.name}
                </a>
                <button
                  onClick={() => handleDelete(d.id, d.path)}
                  className="text-red-500"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>

          <button onClick={onClose} className="mt-4 border px-4 py-2 rounded">
            Fermer
          </button>
        </div>
      </div>
    </Dialog>
  );
}