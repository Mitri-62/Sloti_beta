// src/pages/MasterData.tsx - VERSION COMPLÈTE
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import MasterDataTable from "../components/MasterDataTable";
import MasterDataFormModal from "../components/MasterDataFormModal";
import { Upload, Plus, AlertCircle, Package } from "lucide-react";
import { toast } from "sonner";

export default function MasterData() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);

  // ✅ Chargement des produits avec filtre company_id
  const loadProducts = async () => {
    if (!user?.company_id) {
      console.error("Pas de company_id");
      setLoading(false);
      return;
    }

    setLoading(true);
    
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

  // ✅ Ajout d'un article
  const handleAdd = () => {
    setEditProduct(null);
    setShowModal(true);
  };

  // ✅ Édition d'un article
  const handleEdit = (row: any) => {
    setEditProduct(row);
    setShowModal(true);
  };

  // ✅ Suppression d'un article
  const handleDelete = async (row: any) => {
    if (!confirm("Supprimer cet article ?")) return;
    
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

  // ✅ Sauvegarde d'un article (création ou mise à jour)
  const handleSave = async (formData: any) => {
    if (!user?.company_id) {
      toast.error("Erreur: company_id manquant");
      return;
    }

    try {
      const dataWithCompany = {
        ...formData,
        company_id: user.company_id
      };

      if (editProduct) {
        // Mise à jour
        const { error } = await supabase
          .from("masterdata")
          .update(dataWithCompany)
          .eq("id", editProduct.id)
          .eq("company_id", user.company_id);

        if (error) throw error;
        toast.success("Article mis à jour");
      } else {
        // Création
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

  // ✅ Import CSV/Excel avec toutes les fonctionnalités
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.company_id) {
      toast.error("Erreur: Pas de company_id");
      return;
    }

    toast.info("📥 Import en cours...");

    try {
      let parsedData: any[] = [];
      const fileName = file.name.toLowerCase();

      // Import CSV
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split("\n").filter(l => l.trim());
        
        if (lines.length < 2) {
          toast.error("Fichier CSV vide");
          return;
        }

        // Détecter le séparateur (, ou ;)
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim());
        
        parsedData = lines.slice(1).map(line => {
          const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i];
          });
          return row;
        });
      } 
      // Import Excel
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedData = XLSX.utils.sheet_to_json(worksheet);
      } 
      else {
        toast.error("Format non supporté (.csv, .xlsx uniquement)");
        return;
      }

      console.log(`📊 ${parsedData.length} lignes détectées`);

      // Mapping et validation
      const validEntries = parsedData
        .filter((row: any) => {
          return (row.Article || row.sku) && (row['Qté EqpCh.'] || row.qty_per_pallet);
        })
        .map((row: any) => ({
          company_id: user.company_id,
          
          // Informations de base
          sku: String(row.Article || row.sku || '').trim(),
          designation: String(row['Désignation article'] || row.designation || '').trim(),
          tus: (row.TUS || row.tus || 'FEU').toUpperCase(),
          
          // Quantités et poids (poids en KG dans l'Excel)
          qty_per_pallet: parseFloat(row['Qté EqpCh.'] || row.qty_per_pallet) || 0,
          poids_net: parseFloat(row['Poids net'] || row.poids_net) || 0,
          poids_brut: parseFloat(row['Poids brut'] || row.poids_brut) || 0,
          
          // Dimensions (en MM dans l'Excel)
          longueur: parseFloat(row.Longueur || row.longueur) || 1200,
          largeur: parseFloat(row.Largeur || row.largeur) || 800,
          hauteur: parseFloat(row.Hauteur || row.hauteur) || 150,
          
          // Couches
          nb_couches: parseInt(row.Compteur || row.nb_couches) || 8,
          hauteur_couche: parseFloat(row.Hauteur || row.hauteur) || 150,
          
          // Gerbage (valeurs par défaut)
          stackable: true,
          max_stack_weight: 600,
          
          // Autres
          ean: String(row['Code EAN/UPC'] || row.ean || ''),
          unite_mesure: 'MM',
          unite: 'KG',
        }))
        .filter((entry: any) => entry.sku && entry.qty_per_pallet > 0);

      console.log(`✅ ${validEntries.length} entrées valides`);

      if (validEntries.length === 0) {
        toast.warning("Aucune donnée valide trouvée dans le fichier");
        return;
      }

      // Vérifier les doublons existants
      const skus = validEntries.map((e: any) => e.sku);
      const { data: existing } = await supabase
        .from("masterdata")
        .select("sku")
        .eq("company_id", user.company_id)
        .in("sku", skus);

      const existingSKUs = new Set(existing?.map((e: any) => e.sku) || []);
      const newEntries = validEntries.filter((e: any) => !existingSKUs.has(e.sku));
      const duplicates = validEntries.length - newEntries.length;

      if (newEntries.length === 0) {
        toast.warning(`Tous les ${validEntries.length} SKU existent déjà`);
        return;
      }

      // Import par lots de 100
      const batchSize = 100;
      let totalImported = 0;
      
      for (let i = 0; i < newEntries.length; i += batchSize) {
        const batch = newEntries.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from("masterdata")
          .insert(batch);

        if (error) {
          console.error("Erreur Supabase:", error);
          toast.error(`Erreur au lot ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          break;
        }
        
        totalImported += batch.length;
        
        if (newEntries.length > batchSize) {
          toast.info(`📦 ${totalImported}/${newEntries.length} importés...`);
        }
      }

      await loadProducts();

      const message = duplicates > 0 
        ? `✅ ${totalImported} nouveaux articles importés (${duplicates} doublons ignorés)`
        : `✅ ${totalImported} articles importés avec succès`;
      
      toast.success(message);

    } catch (error: any) {
      console.error("Erreur import:", error);
      toast.error(`Erreur: ${error.message}`);
    }

    e.target.value = '';
  };

  // ✅ Configuration des colonnes du tableau
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

  // ✅ Affichage erreur si pas de company_id
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

  // ✅ Rendu principal
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
          initialData={editProduct}
        />
      )}
    </div>
  );
}