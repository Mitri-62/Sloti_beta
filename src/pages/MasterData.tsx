import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import MasterDataTable from "../components/MasterDataTable";
import MasterDataFormModal from "../components/MasterDataFormModal";
import { Upload } from "lucide-react";

export default function MasterData() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("masterdata")
      .select("*")
      .order("sku");

    if (error) console.error(error);
    else setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAdd = () => {
    setEditProduct(null);
    setShowModal(true);
  };

  const handleEdit = (row: any) => {
    setEditProduct(row);
    setShowModal(true);
  };

  const handleDelete = async (row: any) => {
    if (!confirm("Supprimer cet article ?")) return;
    await supabase.from("masterdata").delete().eq("id", row.id);
    loadProducts();
  };

  const handleSave = async (formData: any) => {
    if (editProduct) {
      await supabase.from("masterdata").update(formData).eq("id", editProduct.id);
    } else {
      await supabase.from("masterdata").insert([formData]);
    }
    setShowModal(false);
    loadProducts();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    try {
      let data: any[] = [];
      const fileName = file.name.toLowerCase();
  
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split("\n").filter(l => l.trim());
        
        if (lines.length < 2) {
          alert("Fichier CSV vide ou invalide");
          return;
        }
  
        const headers = lines[0].split(/[,;\t]/).map(h => h.trim());
        data = lines.slice(1).map(line => {
          const values = line.split(/[,;\t]/).map(v => v.trim());
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i];
          });
          return row;
        });
  
      } else if (fileName.endsWith('.xlsx')) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
          alert("Bibliothèque XLSX non chargée");
          return;
        }
  
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      }
  
      // Mapping exact selon la structure détectée
      const validEntries = data
      .filter(row => row.Article && row['Qté EqpCh.'])
      .map(row => {
        const entry = {
          sku: row.Article,
          tus: row.TUS || "FEU",
          designation: row['Désignation article'] || "",
          qty_per_pallet: parseFloat(row['Qté EqpCh.']) || 0,
          poids_net: parseFloat(row['Poids net']) || 0,
          poids_brut: parseFloat(row['Poids brut']) || 0,
          longueur: parseFloat(row.Longueur) || 0,  // ✅ En MM
          largeur: parseFloat(row.Largeur) || 0,    // ✅ En MM
          hauteur: (parseFloat(row.Hauteur) || 0) * (parseFloat(row.Compteur) || 10),  // ✅ En MM
          hauteur_couche: parseFloat(row.Hauteur) || 0,  // ✅ En MM
          nb_couches: parseInt(row.Compteur) || 10,
          stackable: true,
          max_stack_weight: 600,
          ean: String(row['Code EAN/UPC'] || ''),
        };
        
        console.log("Entry mappée:", entry);
        return entry;
      });
  
      console.log(`${validEntries.length} entrées à insérer`);
  
      if (validEntries.length === 0) {
        alert("Aucune donnée valide trouvée");
        return;
      }
  
      const { data: insertedData, error } = await supabase
        .from("masterdata")
        .insert(validEntries)
        .select();
  
      if (error) {
        console.error("Erreur Supabase:", error);
        alert(`Erreur: ${error.message}`);
      } else {
        console.log("Données insérées:", insertedData);
        alert(`✓ ${validEntries.length} articles importés !`);
        loadProducts();
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      alert(`Erreur: ${error.message}`);
    }
  
    e.target.value = '';
  };
  const columns = [
    { key: "sku", label: "SKU" },
    { key: "tus", label: "Type" },
    { key: "designation", label: "Désignation" },
    { key: "qty_per_pallet", label: "Qté/palette" },
    { key: "poids_brut", label: "Poids brut (kg)" },
    { key: "nb_couches", label: "Couches" },
    { 
      key: "stackable", 
      label: "Gerbable", 
      render: (val: boolean) => (
        <span className={val ? "text-green-600" : "text-gray-400"}>
          {val ? "✓" : "✗"}
        </span>
      )
    },
    { key: "ean", label: "EAN" },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Master Data</h1>
        
        <div className="flex gap-3">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleImport}
            className="hidden"
            id="masterdata-import"
          />
          <label 
            htmlFor="masterdata-import" 
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition-colors"
          >
            <Upload size={20} />
            <span>Importer CSV/XLSX</span>
          </label>
          
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Nouvel article
          </button>
        </div>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <MasterDataTable
          data={products}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showModal && (
        <MasterDataFormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          initialData={editProduct}
        />
      )}
    </div>
  );
}