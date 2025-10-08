import { supabase } from "../supabaseClient";

async function importDemo() {
  const demoData = [
    {
      sku: "DEMO001",
      designation: "Produit Test A",
      qty_per_pallet: 204,
      poids_brut: 250,
      longueur: 1200,
      largeur: 800,
      hauteur: 1400,
      hauteur_couche: 175,
      nb_couches: 8,
      stackable: true,
      max_stack_weight: 500,
      unite_mesure: "MM",
      unite: "KG"
    },
    {
      sku: "DEMO002",
      designation: "Produit Test B",
      qty_per_pallet: 120,
      poids_brut: 180,
      longueur: 1200,
      largeur: 1000,
      hauteur: 1200,
      hauteur_couche: 150,
      nb_couches: 8,
      stackable: true,
      max_stack_weight: 400,
      unite_mesure: "MM",
      unite: "KG"
    }
  ];

  const { error } = await supabase.from("masterdata").insert(demoData);
  if (error) console.error(error);
  else console.log("✓ Données démo insérées");
}

importDemo();