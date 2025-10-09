// src/hooks/useMasterData.ts - VERSION CORRIGÉE
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export interface MasterDataItem {
  id?: string;
  sku: string;
  designation: string;
  tus: string;
  qty_per_pallet: number;
  poids_net: number;
  poids_brut: number;
  longueur: number;
  largeur: number;
  hauteur: number;
  hauteur_couche: number;
  nb_couches: number;
  stackable: boolean;
  max_stack_weight?: number;
  unite_mesure?: string;
  unite?: string;
  ean?: string;
  company_id?: string;
}

export function useMasterData() {
  const { user } = useAuth();
  const [masterData, setMasterData] = useState<Map<string, MasterDataItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMasterData = async () => {
    if (!user?.company_id) {
      console.error("❌ Pas de company_id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ FIX: Filtrer par company_id
      const { data, error: fetchError } = await supabase
        .from("masterdata")
        .select("*")
        .eq("company_id", user.company_id);

      if (fetchError) throw fetchError;

      const mdMap = new Map<string, MasterDataItem>();

      data?.forEach((item: any) => {
        const longueurPalette = parseFloat(item.longueur) / 1000 || 1.2;
        const largeurPalette = parseFloat(item.largeur) / 1000 || 0.8;
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
          company_id: item.company_id,
        });
      });

      setMasterData(mdMap);
      console.log(`✅ ${mdMap.size} SKU chargés pour company ${user.company_id}`);
    } catch (err: any) {
      setError(err.message);
      console.error("❌ Erreur chargement MasterData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, [user?.company_id]);

  const upsertSKU = async (item: Partial<MasterDataItem>) => {
    if (!user?.company_id) {
      console.error("❌ Pas de company_id pour upsert");
      return false;
    }

    try {
      // ✅ FIX: Toujours inclure company_id
      const dataWithCompany = {
        ...item,
        company_id: user.company_id
      };

      if (item.id) {
        const { error } = await supabase
          .from("masterdata")
          .update(dataWithCompany)
          .eq("id", item.id)
          .eq("company_id", user.company_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("masterdata")
          .insert([dataWithCompany]);
        if (error) throw error;
      }
      
      await loadMasterData();
      return true;
    } catch (err: any) {
      console.error("❌ Erreur upsert:", err);
      return false;
    }
  };

  const deleteSKU = async (sku: string) => {
    if (!user?.company_id) return false;

    try {
      // ✅ FIX: Vérifier company_id
      const { error } = await supabase
        .from("masterdata")
        .delete()
        .eq("sku", sku)
        .eq("company_id", user.company_id);
      
      if (error) throw error;
      await loadMasterData();
      return true;
    } catch (err: any) {
      console.error("❌ Erreur suppression:", err);
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