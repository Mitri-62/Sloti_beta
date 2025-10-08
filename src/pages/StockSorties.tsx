import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Upload,
  Camera,
  Edit,
  PackageMinus,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingDown,
  Truck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

function excelDateToJSDate(serial: any): string | null {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split("T")[0];
}

export default function StockSorties() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "scan" | "excel">(
    "manual"
  );

  const [formData, setFormData] = useState({
    quantite: "",
    code128: "",
    lot: "",
    dlc: "",
    movementName: "",
  });

  const [lastScan, setLastScan] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [summary, setSummary] = useState<{
    supprimées: number;
    introuvables: number;
  }>({
    supprimées: 0,
    introuvables: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🔹 Suppression du stock
  const removeStock = async (ean: string, extra: any = {}) => {
    if (!companyId || !ean) return false;
  
    const cleanEan = String(ean).trim();
  
    const { data: existing } = await supabase
      .from("stocks")
      .select("*")  // ✅ Retour à select("*") comme avant
      .eq("ean", cleanEan)
      .eq("company_id", companyId)
      .maybeSingle();
  
    if (existing) {
      await supabase.from("stocks").delete().eq("id", existing.id);
      await supabase.from("stock_movements").insert([
        {
          stock_id: existing.id,
          movement_type: "sortie",
          quantity: existing.quantity,
          lot: extra.lot || existing.lot,
          expiration_date: extra.expiration_date || existing.expiration_date,
          company_id: companyId,
          movement_name: formData.movementName,
        },
      ]);
      return true;
    }
    return false;
  };

  // 🔹 Ajout manuel
  const handleManualAdd = async () => {
    setError(null);

    if (!formData.code128) {
      setError("EAN obligatoire");
      return;
    }

    if (!formData.movementName) {
      setError("Nom de l'expédition requis (ex: EXP01)");
      return;
    }

    try {
      const success = await removeStock(formData.code128, {
        lot: formData.lot,
        expiration_date: formData.dlc,
      });

      if (success) {
        alert("Sortie enregistrée !");
        setFormData({
          ...formData,
          quantite: "",
          code128: "",
          lot: "",
          dlc: "",
        });
      } else {
        setError("EAN introuvable dans le stock");
      }
    } catch (err) {
      setError("Erreur lors de l'enregistrement");
    }
  };

  // 🔹 Import Excel
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
  
      let supprimées = 0;
      let introuvables = 0;
  
      const transformed = await Promise.all(
        rows.map(async (row) => {
          const ean = row["Unité stock cédant"]
            ? String(row["Unité stock cédant"]).trim()
            : null;
          let status: "supprimée" | "introuvable" = "introuvable";
          let stockData = null;
  
          if (ean && companyId) {
            const { data: existing } = await supabase
              .from("stocks")
              .select("id, name, quantity")  // ✅ name au lieu de sku
              .eq("ean", ean)
              .eq("company_id", companyId)
              .maybeSingle();
  
            if (existing) {
              status = "supprimée";
              stockData = existing;
              supprimées++;
            } else {
              introuvables++;
            }
          }
  
          return {
            ean,
            sku: stockData?.name || row["Article"] || "UNKNOWN",  // ✅ name = sku
            quantity: stockData?.quantity || parseInt(row["Quantité"]) || 1,
            lot: row["Lot"] || null,
            expiration_date:
              excelDateToJSDate(row["Date péremption/DLC"]) ||
              row["Date péremption/DLC"] ||
              null,
            article: row["Article"] || "-",
            status,
          };
        })
      );
  
      setPreviewData(transformed);
      setSummary({ supprimées, introuvables });
    } catch (err) {
      setError("Erreur lors de la lecture du fichier");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Confirmation import
  const confirmImport = async () => {
    if (!companyId || !formData.movementName) {
      setError("Nom d'expédition requis");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      for (const row of previewData) {
        if (row.status === "supprimée" && row.ean) {
          await removeStock(row.ean, {
            lot: row.lot,
            expiration_date: row.expiration_date,
          });
        }
      }

      await supabase.from("activities").insert([
        {
          company_id: companyId,
          message: `Export "${formData.movementName}" : ${summary.supprimées} palettes supprimées | ${summary.introuvables} introuvables`,
        },
      ]);

      alert("Sorties confirmées !");
      setPreviewData([]);
      setSummary({ supprimées: 0, introuvables: 0 });
      setFormData({ ...formData, movementName: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError("Erreur pendant l'export");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Annuler import
  const handleCancelImport = () => {
    setPreviewData([]);
    setSummary({ supprimées: 0, introuvables: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 🔹 Export vers module de chargement
  const exportForLoading = () => {
    const validPallets = previewData
      .filter((row) => row.status === "supprimée" && row.ean)
      .map((row) => ({
        sscc: row.ean,
        sku: row.sku,
        quantity: row.quantity,
      }));

    if (validPallets.length === 0) {
      alert("Aucune palette valide à exporter");
      return;
    }

    const csv = [
      "sscc,sku,quantity",
      ...validPallets.map((p) => `${p.sscc},${p.sku},${p.quantity}`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chargement-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    alert(`${validPallets.length} palettes exportées pour le chargement`);
  };

  // 🔹 Scan
  const handleScan = async (code: string) => {
    setLastScan(code);
    const success = await removeStock(code);
    if (success) {
      alert(`Sortie scannée : ${code}`);
    } else {
      setError(`EAN introuvable : ${code}`);
    }
  };

  const startScan = async () => {
    const codeReader = new BrowserMultiFormatReader();
    const videoElement = document.getElementById(
      "video-sorties"
    ) as HTMLVideoElement;

    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    if (devices.length > 0) {
      const backCamera =
        devices.find((d) => d.label.toLowerCase().includes("back")) ||
        devices[0];
      codeReader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoElement,
        (result) => {
          if (result) {
            handleScan(result.getText());
            (codeReader as any).reset();
          }
        }
      );
    } else {
      alert("Aucune caméra détectée");
    }
  };

  // 🔹 Rendu UI
  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="text-red-600" size={28} />
            Sorties Stock
          </h1>
          <p className="text-gray-600 mt-1">
            Enregistrez vos expéditions de marchandises
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
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
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
            {/* 🔹 Error message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* 🔹 Onglet manuel */}
            {activeTab === "manual" && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.movementName}
                  onChange={(e) =>
                    setFormData({ ...formData, movementName: e.target.value })
                  }
                  placeholder="Nom de l'expédition (ex: EXP01) *"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="Code128 (EAN) *"
                    value={formData.code128}
                    onChange={(e) =>
                      setFormData({ ...formData, code128: e.target.value })
                    }
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="Quantité (info)"
                    type="number"
                    value={formData.quantite}
                    onChange={(e) =>
                      setFormData({ ...formData, quantite: e.target.value })
                    }
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="Lot (facultatif)"
                    value={formData.lot}
                    onChange={(e) =>
                      setFormData({ ...formData, lot: e.target.value })
                    }
                  />
                  <input
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    type="date"
                    value={formData.dlc}
                    onChange={(e) =>
                      setFormData({ ...formData, dlc: e.target.value })
                    }
                  />
                </div>

                <button
                  onClick={handleManualAdd}
                  className="w-full sm:w-auto bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <PackageMinus size={20} />
                  Enregistrer sortie
                </button>
              </div>
            )}

            {/* 🔹 Onglet scan */}
            {activeTab === "scan" && (
              <div className="space-y-4">
                <video
                  id="video-sorties"
                  className="w-full max-w-md mx-auto border rounded-lg"
                />
                <button
                  onClick={startScan}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Camera size={20} />
                  Lancer le scan
                </button>
                {lastScan && (
                  <p className="text-center text-gray-600">
                    Dernier scan :{" "}
                    <span className="font-mono font-bold">{lastScan}</span>
                  </p>
                )}
              </div>
            )}

            {/* 🔹 Onglet excel */}
            {activeTab === "excel" && (
              <div className="space-y-4">
                <label className="flex items-center justify-center gap-2 cursor-pointer bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-colors w-full sm:w-auto">
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
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-orange-900">
                        <CheckCircle className="inline mr-2" size={16} />
                        {summary.supprimées} palettes à supprimer |
                        <XCircle className="inline mx-2" size={16} />
                        {summary.introuvables} introuvables
                      </p>
                    </div>

                    <input
                      type="text"
                      value={formData.movementName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          movementName: e.target.value,
                        })
                      }
                      placeholder="Nom de l'expédition (ex: EXP01) *"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />

                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold">
                                EAN
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                SKU
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Qté
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Article
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Lot
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                DLC
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Statut
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {previewData.map((row, i) => (
                              <tr
                                key={i}
                                className={
                                  row.status === "supprimée"
                                    ? "bg-green-50"
                                    : "bg-red-50"
                                }
                              >
                                <td className="px-4 py-2 font-mono text-xs">
                                  {row.ean || "-"}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs">
                                  {row.sku}
                                </td>
                                <td className="px-4 py-2">{row.quantity}</td>
                                <td className="px-4 py-2">{row.article}</td>
                                <td className="px-4 py-2">{row.lot || "-"}</td>
                                <td className="px-4 py-2">
                                  {row.expiration_date || "-"}
                                </td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      row.status === "supprimée"
                                        ? "bg-green-200 text-green-800"
                                        : "bg-red-200 text-red-800"
                                    }`}
                                  >
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Boutons actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={confirmImport}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Export en cours...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            Confirmer l'export
                          </>
                        )}
                      </button>

                      <button
                        onClick={exportForLoading}
                        disabled={loading}
                        className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Truck size={20} />
                        Exporter pour chargement
                      </button>

                      <button
                        onClick={handleCancelImport}
                        disabled={loading}
                        className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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