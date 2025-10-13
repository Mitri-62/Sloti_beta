import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Upload, Camera, Edit, Package, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

function excelDateToJSDate(serial: any): string | null {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split("T")[0];
}

export default function StockEntrees() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "scan" | "excel">("manual");

  // Champs manuels
  const [formData, setFormData] = useState({
    article: "",
    nom: "",
    quantite: "",
    type: "",
    code128: "",
    lot: "",
    dlc: "",
    typeMagasinPrenant: "",
    emplacementPrenant: "",
    designation: "",
    emplacementCedant: "",
    ordreTransfert: "",
    movementName: "",
  });

  const [lastScan, setLastScan] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ existantes: number; nouvelles: number }>({
    existantes: 0,
    nouvelles: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addStock = async (qty: number, fields: any) => {
    if (!companyId || !fields.ean) return;

    const { data: existing } = await supabase
      .from("stocks")
      .select("id")
      .eq("ean", fields.ean)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("stocks").insert([{
        ean: fields.ean,
        name: fields.name,
        type: fields.type,
        quantity: qty,
        lot: fields.lot,
        expiration_date: fields.expiration_date,
        type_magasin_prenant: fields.type_magasin_prenant,
        emplacement_prenant: fields.emplacement_prenant,
        designation: fields.designation,
        emplacement_cedant: fields.emplacement_cedant,
        ordre_transfert: fields.ordre_transfert,
        qte_theorique_prenant: fields.qte_theorique_prenant,
        company_id: companyId,
        movement_name: fields.movement_name,
        import_date: new Date().toISOString(),
      }]);
    }
  };

  const handleManualAdd = async () => {
    setError(null);
    const qty = parseInt(formData.quantite, 10);

    if (!formData.article || !qty || isNaN(qty)) {
      setError("Article et quantité obligatoires");
      return;
    }

    if (!formData.movementName) {
      setError("Nom de la réception requis (ex: NSF01)");
      return;
    }

    try {
      await addStock(qty, {
        ean: formData.code128,
        name: formData.nom || formData.article,
        type: formData.type,
        lot: formData.lot,
        expiration_date: formData.dlc,
        type_magasin_prenant: formData.typeMagasinPrenant,
        emplacement_prenant: formData.emplacementPrenant,
        designation: formData.designation || formData.nom || formData.article,
        emplacement_cedant: formData.emplacementCedant,
        ordre_transfert: formData.ordreTransfert,
        qte_theorique_prenant: qty.toString(),
        movement_name: formData.movementName,
      });

      alert(`Entrée ajoutée au mouvement "${formData.movementName}"`);
      setFormData({
        article: "",
        nom: "",
        quantite: "",
        type: "",
        code128: "",
        lot: "",
        dlc: "",
        typeMagasinPrenant: "",
        emplacementPrenant: "",
        designation: "",
        emplacementCedant: "",
        ordreTransfert: "",
        movementName: formData.movementName, // Garder le nom
      });
    } catch (err) {
      setError("Erreur lors de l'ajout");
    }
  };

  const handleExcelSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet);

      let existantes = 0;
      let nouvelles = 0;

      const transformed = await Promise.all(
        rows.map(async (row) => {
          const ean = row["Unité stock cédant"] || null;
          let status: "nouvelle" | "existante" = "nouvelle";

          if (ean && companyId) {
            const { data: existing } = await supabase
              .from("stocks")
              .select("id")
              .eq("ean", ean)
              .eq("company_id", companyId)
              .maybeSingle();

            if (existing) {
              status = "existante";
              existantes++;
            } else {
              nouvelles++;
            }
          }

          return {
            article: row["Article"],
            qte_theorique_cedant: row["Qté théor.pos.cédant"],
            lot: row["Lot"] || null,
            expiration_date: excelDateToJSDate(row["Date péremption/DLC"]) || row["Date péremption/DLC"] || null,
            type_magasin_prenant: row["Type magasin prenant"] || null,
            emplacement_prenant: row["Emplacement prenant"] || null,
            type: row["Unité de quantité alternative"] || "N/A",
            designation: row["Désignation de l'article"] || row["Désignation"] || null,
            emplacement_cedant: row["Emplacement cédant"] || null,
            ordre_transfert: row["Numéro de l'ordre de transfert"] || null,
            ean,
            qte_theorique_prenant: row["Qté théor. pos. pren"] || null,
            status,
          };
        })
      );

      setPreviewData(transformed);
      setSummary({ existantes, nouvelles });
    } catch (err) {
      setError("Erreur lors de la lecture du fichier");
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!companyId || !formData.movementName) {
      setError("Nom de réception requis");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      for (const row of previewData) {
        if (row.status === "nouvelle") {
          await addStock(parseInt(row.qte_theorique_cedant, 10) || 0, {
            ean: row.ean,
            name: row.article,
            type: row.type,
            lot: row.lot,
            expiration_date: row.expiration_date,
            type_magasin_prenant: row.type_magasin_prenant,
            emplacement_prenant: row.emplacement_prenant,
            designation: row.designation,
            emplacement_cedant: row.emplacement_cedant,
            ordre_transfert: row.ordre_transfert,
            qte_theorique_prenant: row.qte_theorique_prenant,
            movement_name: formData.movementName,
          });
        }
      }

      await supabase.from("activities").insert([{
        company_id: companyId,
        message: `Réception "${formData.movementName}" : ${summary.nouvelles} palettes ajoutées | ${summary.existantes} déjà existantes`,
      }]);

      alert("Import Excel terminé !");
      setPreviewData([]);
      setSummary({ existantes: 0, nouvelles: 0 });
      setFormData({ ...formData, movementName: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError("Erreur pendant l'import");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelImport = () => {
    setPreviewData([]);
    setSummary({ existantes: 0, nouvelles: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleScan = async (code: string) => {
    setLastScan(code);
    await addStock(1, {
      ean: code,
      name: "Scan produit",
      type: "N/A",
      movement_name: formData.movementName || "SCAN",
    });
    alert(`Entrée scannée : ${code}`);
  };

  const startScan = async () => {
    const codeReader = new BrowserMultiFormatReader();
    const videoElement = document.getElementById("video-entrees") as HTMLVideoElement;

    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    if (devices.length > 0) {
      const backCamera = devices.find((d) => d.label.toLowerCase().includes("back")) || devices[0];
      codeReader.decodeFromVideoDevice(backCamera.deviceId, videoElement, (result) => {
        if (result) {
          handleScan(result.getText());
          (codeReader as any).reset();
        }
      });
    } else {
      alert("Aucune caméra détectée");
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="text-green-600 dark:text-green-500" size={28} />
            Entrées Stock
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Enregistrez vos réceptions de marchandises</p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex" aria-label="Tabs">
              {[
                { id: "manual", label: "Saisie manuelle", icon: Edit },
                { id: "scan", label: "Scanner", icon: Camera },
                { id: "excel", label: "Import Excel", icon: Upload },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-green-600 dark:border-green-500 text-green-600 dark:text-green-500"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <tab.icon size={20} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Saisie manuelle */}
            {activeTab === "manual" && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.movementName}
                  onChange={(e) => setFormData({ ...formData, movementName: e.target.value })}
                  placeholder="Nom de la réception (ex: NSF01) *"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Article *"
                    value={formData.article}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Nom produit"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Quantité *"
                    type="number"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Unité (PCE, KG...)"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Code128 (EAN)"
                    value={formData.code128}
                    onChange={(e) => setFormData({ ...formData, code128: e.target.value })}
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Lot"
                    value={formData.lot}
                    onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    type="date"
                    value={formData.dlc}
                    onChange={(e) => setFormData({ ...formData, dlc: e.target.value })}
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="Emplacement Prenant"
                    value={formData.emplacementPrenant}
                    onChange={(e) => setFormData({ ...formData, emplacementPrenant: e.target.value })}
                  />
                </div>

                <button
                  onClick={handleManualAdd}
                  className="w-full sm:w-auto bg-green-600 dark:bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Ajouter l'entrée
                </button>
              </div>
            )}

            {/* Scanner */}
            {activeTab === "scan" && (
              <div className="space-y-4">
                <video id="video-entrees" className="w-full max-w-md mx-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-black" />
                <button
                  onClick={startScan}
                  className="w-full sm:w-auto bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Camera size={20} />
                  Lancer le scan
                </button>
                {lastScan && (
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    Dernier scan : <span className="font-mono font-bold text-gray-900 dark:text-white">{lastScan}</span>
                  </p>
                )}
              </div>
            )}

            {/* Import Excel */}
            {activeTab === "excel" && (
              <div className="space-y-4">
                <label className="flex items-center justify-center gap-2 cursor-pointer bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium transition-colors w-full sm:w-auto">
                  <Upload size={20} />
                  Sélectionner un fichier
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleExcelSelect}
                  />
                </label>

                {previewData.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        <XCircle className="inline mr-2" size={16} />
                        {summary.existantes} palettes existantes | 
                        <CheckCircle className="inline mx-2" size={16} />
                        {summary.nouvelles} palettes à ajouter
                      </p>
                    </div>

                    <input
                      type="text"
                      value={formData.movementName}
                      onChange={(e) => setFormData({ ...formData, movementName: e.target.value })}
                      placeholder="Nom de la réception (ex: NSF01) *"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />

                    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Article</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Quantité</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Lot</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">DLC</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {previewData.map((row, i) => (
                              <tr 
                                key={i} 
                                className={row.status === "existante" 
                                  ? "bg-red-50 dark:bg-red-900/20" 
                                  : "bg-green-50 dark:bg-green-900/20"
                                }
                              >
                                <td className="px-4 py-2 text-gray-900 dark:text-white">{row.article}</td>
                                <td className="px-4 py-2 font-bold text-gray-900 dark:text-white">{row.qte_theorique_cedant}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{row.lot || "-"}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{row.expiration_date || "-"}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    row.status === "existante" 
                                      ? "bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300" 
                                      : "bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                                  }`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={confirmImport}
                        disabled={loading}
                        className="flex-1 bg-green-600 dark:bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Import en cours...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            Confirmer l'import
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelImport}
                        disabled={loading}
                        className="flex-1 bg-red-600 dark:bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} />
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}