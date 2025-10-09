import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export interface MasterDataItem {
  id?: number;
  sku: string;
  designation: string;
  tus?: string; // Type d'unité de stock (FEU, FCH, DPH...)
  qty_per_pallet: number;
  poids_net: number;
  poids_brut: number;
  longueur: number;
  largeur: number;
  hauteur: number;
  hauteur_couche?: number;
  nb_couches?: number;
  stackable: boolean;
  max_stack_weight?: number;
  unite_mesure?: string;
  unite?: string;
  ean?: string;
}

export function useMasterData() {
  const [masterData, setMasterData] = useState<Map<string, MasterDataItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMasterData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("masterdata")
        .select("*")
        .order("sku");

      if (fetchError) throw fetchError;

      const mdMap = new Map<string, MasterDataItem>();
      
      data?.forEach((item: any) => {
        // Dimensions de la palette selon le TUS
        let longueurPalette = 1.2;
        let largeurPalette = 0.8;
        
        switch(item.tus) {
          case "FEU": // Format Europe
            longueurPalette = 1.2;
            largeurPalette = 0.8;
            break;
          case "FCH": // Format CHEP (US)
            longueurPalette = 1.2;
            largeurPalette = 1.0;
            break;
          case "DPH": // Demi-palette
            longueurPalette = 0.8;
            largeurPalette = 0.6;
            break;
          default:
            // Par défaut, utiliser FEU
            longueurPalette = 1.2;
            largeurPalette = 0.8;
        }
        
        // Hauteur palette = hauteur d'un carton × nombre de couches
        const nbCouches = parseInt(item.nb_couches || item.compteur) || 8;
        const hauteurCarton = parseFloat(item.hauteur) || 150; // en MM
        const hauteurPalette = (hauteurCarton * nbCouches) / 1000; // Conversion en mètres

        const hauteur_couche = item.hauteur_couche || hauteurCarton;

        mdMap.set(item.sku, {
          id: item.id,
          sku: item.sku,
          designation: item.designation || "",
          tus: item.tus || "FEU",
          qty_per_pallet: parseFloat(item.qty_per_pallet) || 0,
          poids_net: parseFloat(item.poids_net) || 0,
          poids_brut: parseFloat(item.poids_brut) || 0,
          longueur: longueurPalette,
          largeur: largeurPalette,
          hauteur: hauteurPalette,
          hauteur_couche: parseFloat(hauteur_couche) / 1000 || 0.15,
          nb_couches: nbCouches,
          stackable: item.stackable === true || item.stackable === "true",
          max_stack_weight: parseFloat(item.max_stack_weight) || undefined,
          unite_mesure: item.unite_mesure || "MM",
          unite: item.unite || "KG",
          ean: item.ean || "",
        });
      });

      setMasterData(mdMap);
      console.log(`✅ ${mdMap.size} SKU chargés depuis Supabase`);
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur chargement MasterData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  const upsertSKU = async (item: Partial<MasterDataItem>) => {
    try {
      if (item.id) {
        const { error } = await supabase
          .from("masterdata")
          .update(item)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("masterdata")
          .insert([item]);
        if (error) throw error;
      }
      
      await loadMasterData();
      return true;
    } catch (err: any) {
      console.error("Erreur upsert:", err);
      return false;
    }
  };

  const deleteSKU = async (sku: string) => {
    try {
      const { error } = await supabase
        .from("masterdata")
        .delete()
        .eq("sku", sku);
      
      if (error) throw error;
      await loadMasterData();
      return true;
    } catch (err: any) {
      console.error("Erreur suppression:", err);
      return false;
    }
  };

  const getSKU = (sku: string): MasterDataItem | undefined => {
    return masterData.get(sku);
  };

  const getAllSKUs = (): MasterDataItem[] => {
    return Array.from(masterData.values());
  };

  return {
    masterData,
    loading,
    error,
    loadMasterData,
    upsertSKU,
    deleteSKU,
    getSKU,
    getAllSKUs,
  };
}