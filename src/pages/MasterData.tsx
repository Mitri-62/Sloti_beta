// src/pages/MasterData.tsx - VERSION CORRIGÉE AVEC COMPANY_ID
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import MasterDataTable from "../components/MasterDataTable";
import MasterDataFormModal from "../components/MasterDataFormModal";
import { Upload, Plus, AlertCircle, Package} from "lucide-react";
import { toast } from "sonner";


export default function MasterData() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);

  const loadProducts = async () => {
    if (!user?.company_id) {
      console.error("Pas de company_id");
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // ✅ FIX: Ajouter le filtre company_id
    const { data, error } = await supabase
      .from("masterdata")
      .select("*")
      .eq("company_id", user.company_id)
      .order("sku");

    if (error) {
      console.error("Erreur chargement MasterData:", error);
      toast.error("Erreur de chargement");
    } else {
      setProducts(data || []);
      console.log(`✅ ${data?.length || 0} produits chargés pour company ${user.company_id}`);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [user?.company_id]);

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
    
    // ✅ FIX: Vérifier company_id avant suppression
    const { error } = await supabase
      .from("masterdata")
      .delete()
      .eq("id", row.id)
      .eq("company_id", user?.company_id);

    if (error) {
      console.error("Erreur suppression:", error);
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Article supprimé");
      loadProducts();
    }
  };

  const handleSave = async (formData: any) => {
    if (!user?.company_id) {
      toast.error("Erreur: company_id manquant");
      return;
    }

    try {
      // ✅ FIX: Toujours inclure company_id
      const dataWithCompany = {
        ...formData,
        company_id: user.company_id
      };

      if (editProduct) {
        // Update
        const { error } = await supabase
          .from("masterdata")
          .update(dataWithCompany)
          .eq("id", editProduct.id)
          .eq("company_id", user.company_id);

        if (error) throw error;
        toast.success("Article mis à jour");
      } else {
        // Insert
        const { error } = await supabase
          .from("masterdata")
          .insert([dataWithCompany]);

        if (error) throw error;
        toast.success("Article ajouté");
      }

      setShowModal(false);
      loadProducts();
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.company_id) {
      toast.error("Erreur: company_id manquant");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    toast.info("Import en cours...");
  
    try {
      let data: any[] = [];
      const fileName = file.name.toLowerCase();
  
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split("\n").filter(l => l.trim());
        
        if (lines.length < 2) {
          toast.error("Fichier CSV vide ou invalide");
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
          toast.error("Bibliothèque XLSX non chargée");
          return;
        }
  
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      }
  
      // Mapping avec validation
      const validEntries = data
        .filter(row => row.Article && row['Qté EqpCh.'])
        .map(row => ({
          // ✅ FIX: Ajouter company_id à chaque entrée
          company_id: user.company_id,
          sku: row.Article,
          tus: row.TUS || "FEU",
          designation: row['Désignation article'] || "",
          qty_per_pallet: parseFloat(row['Qté EqpCh.']) || 0,
          poids_net: parseFloat(row['Poids net']) || 0,
          poids_brut: parseFloat(row['Poids brut']) || 0,
          longueur: parseFloat(row.Longueur) || 0,
          largeur: parseFloat(row.Largeur) || 0,
          hauteur: (parseFloat(row.Hauteur) || 0) * (parseFloat(row.Compteur) || 10),
          hauteur_couche: parseFloat(row.Hauteur) || 0,
          nb_couches: parseInt(row.Compteur) || 10,
          stackable: true,
          max_stack_weight: 600,
          ean: String(row['Code EAN/UPC'] || ''),
        }));
  
      console.log(`${validEntries.length} entrées à insérer pour company ${user.company_id}`);
  
      if (validEntries.length === 0) {
        toast.warning("Aucune donnée valide trouvée");
        return;
      }
  
      // ✅ FIX: Vérifier les doublons dans la même company
      const skus = validEntries.map(e => e.sku);
      const { data: existing } = await supabase
        .from("masterdata")
        .select("sku")
        .eq("company_id", user.company_id)
        .in("sku", skus);

      const existingSKUs = new Set(existing?.map(e => e.sku) || []);
      const newEntries = validEntries.filter(e => !existingSKUs.has(e.sku));
      const duplicates = validEntries.length - newEntries.length;

      if (newEntries.length === 0) {
        toast.warning("Tous les SKU existent déjà");
        return;
      }

      const { data: insertedData, error } = await supabase
        .from("masterdata")
        .insert(newEntries)
        .select();
  
      if (error) {
        console.error("Erreur Supabase:", error);
        toast.error(`Erreur: ${error.message}`);
      } else {
        console.log("Données insérées:", insertedData);
        toast.success(
          `✓ ${newEntries.length} articles importés !${
            duplicates > 0 ? ` (${duplicates} doublons ignorés)` : ''
          }`
        );
        loadProducts();
      }
    } catch (error: any) {
      console.error("Erreur import:", error);
      toast.error(`Erreur: ${error.message}`);
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
        <span className={val ? "text-green-600 font-semibold" : "text-gray-400"}>
          {val ? "✓ Oui" : "✗ Non"}
        </span>
      )
    },
  ];

  // ✅ Afficher un message si pas de company_id
  if (!user?.company_id) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Erreur de configuration
          </h2>
          <p className="text-gray-600">
            Votre compte n'est pas associé à une entreprise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MasterData</h1>
          <p className="text-sm text-gray-600 mt-1">
            {products.length} articles • {user.company_name}
          </p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Upload size={18} />
            <span className="hidden sm:inline">Importer</span>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Aucun article dans votre MasterData</p>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ajouter votre premier article
          </button>
        </div>
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
    initialData={editProduct}  // ✅ Changé de 'product' à 'initialData'
  />
)}
    </div>
  );
}