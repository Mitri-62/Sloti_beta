// src/hooks/useMasterData.ts - VERSION OPTIMISÉE AVEC FILTRE
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";

export interface MasterDataItem {
  id?: number;
  sku: string;
  designation: string;
  tus?: string;
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

interface UseMasterDataOptions {
  /** Liste des SKU à charger (si vide, charge tout) */
  skuFilter?: string[];
  /** Company ID pour filtrer */
  companyId?: string;
}

export function useMasterData(options: UseMasterDataOptions = {}) {
  const { skuFilter, companyId } = options;
  
  const [masterData, setMasterData] = useState<Map<string, MasterDataItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Mémoriser le filtre pour éviter re-fetch
  const skuFilterString = useMemo(() => 
    skuFilter ? JSON.stringify(skuFilter.sort()) : null, 
    [skuFilter]
  );

  const loadMasterData = async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ AJOUTE CETTE CONDITION ICI, TOUT AU DÉBUT
      if (skuFilter && skuFilter.length === 0) {
        setMasterData(new Map());
        console.log("✅ Aucun SKU à charger (liste vide)");
        setLoading(false);
        return;
      }
      let query = supabase
        .from("masterdata")
        .select("*")
        .order("sku");

      // ✅ Filtrer par company_id si fourni
      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      // ✅ Filtrer par SKU si liste fournie
      if (skuFilter && skuFilter.length > 0) {
        query = query.in("sku", skuFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mdMap = new Map<string, MasterDataItem>();
      
      data?.forEach((item: any) => {
        // Dimensions de la palette selon le TUS
        let longueurPalette = 1.2;
        let largeurPalette = 0.8;
        
        switch(item.tus) {
          case "FEU":
            longueurPalette = 1.2;
            largeurPalette = 0.8;
            break;
          case "FCH":
            longueurPalette = 1.2;
            largeurPalette = 1.0;
            break;
          case "DPH":
            longueurPalette = 0.8;
            largeurPalette = 0.6;
            break;
          default:
            longueurPalette = 1.2;
            largeurPalette = 0.8;
        }
        
        const nbCouches = parseInt(item.nb_couches || item.compteur) || 8;
        const hauteurCarton = parseFloat(item.hauteur) || 150;
        const hauteurPalette = (hauteurCarton * nbCouches) / 1000;
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
      
      // ✅ Log plus informatif
      if (skuFilter && skuFilter.length > 0) {
        console.log(`✅ ${mdMap.size}/${skuFilter.length} SKU chargés depuis Supabase`);
      } else {
        console.log(`✅ ${mdMap.size} SKU chargés depuis Supabase`);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur chargement MasterData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, [skuFilterString, companyId]); // ✅ Recharge seulement si filtre change

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