// src/components/MasterDataFormModal.tsx - VERSION COMPLÈTE AVEC DARK MODE
import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";

interface MasterDataFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

export default function MasterDataFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: MasterDataFormModalProps) {
  const [form, setForm] = useState({
    sku: "",
    designation: "",
    tus: "FEU",
    poids_net: "",
    poids_brut: "",
    longueur: "",
    largeur: "",
    hauteur: "",
    unite_mesure: "MM",
    unite: "KG",
    ean: "",
    qty_per_pallet: "",
    nb_couches: "8",
    hauteur_couche: "",
    stackable: false,
    max_stack_weight: "",
  });

  const HAUTEUR_PALETTE_SUPPORT = 150;
  
  const hauteurPaletteCalculee = form.hauteur && form.nb_couches 
    ? HAUTEUR_PALETTE_SUPPORT + (parseFloat(form.hauteur) * parseInt(form.nb_couches))
    : 0;

  useEffect(() => {
    if (initialData) {
      setForm({
        sku: initialData.sku || "",
        designation: initialData.designation || "",
        tus: initialData.tus || "FEU",
        poids_net: initialData.poids_net?.toString() || "",
        poids_brut: initialData.poids_brut?.toString() || "",
        longueur: initialData.longueur?.toString() || "",
        largeur: initialData.largeur?.toString() || "",
        hauteur: initialData.hauteur?.toString() || "",
        unite_mesure: initialData.unite_mesure || "MM",
        unite: initialData.unite || "KG",
        ean: initialData.ean || "",
        qty_per_pallet: initialData.qty_per_pallet?.toString() || "",
        nb_couches: initialData.nb_couches?.toString() || "8",
        hauteur_couche: initialData.hauteur_couche?.toString() || "",
        stackable: initialData.stackable || false,
        max_stack_weight: initialData.max_stack_weight?.toString() || "",
      });
    } else {
      setForm({
        sku: "",
        designation: "",
        tus: "FEU",
        poids_net: "",
        poids_brut: "",
        longueur: "1200",
        largeur: "800",
        hauteur: "",
        unite_mesure: "MM",
        unite: "KG",
        ean: "",
        qty_per_pallet: "",
        nb_couches: "8",
        hauteur_couche: "",
        stackable: false,
        max_stack_weight: "600",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setForm({ 
      ...form, 
      [name]: type === "checkbox" ? checked : value 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hauteur_couche = form.hauteur ? parseFloat(form.hauteur) : null;
    
    const dataToSave = {
      ...initialData,
      sku: form.sku,
      designation: form.designation,
      tus: form.tus,
      poids_net: form.poids_net ? parseFloat(form.poids_net) : null,
      poids_brut: form.poids_brut ? parseFloat(form.poids_brut) : null,
      longueur: form.longueur ? parseFloat(form.longueur) : null,
      largeur: form.largeur ? parseFloat(form.largeur) : null,
      hauteur: form.hauteur ? parseFloat(form.hauteur) : null,
      qty_per_pallet: form.qty_per_pallet ? parseInt(form.qty_per_pallet) : null,
      nb_couches: form.nb_couches ? parseInt(form.nb_couches) : null,
      hauteur_couche: hauteur_couche,
      stackable: form.stackable,
      max_stack_weight: form.max_stack_weight ? parseFloat(form.max_stack_weight) : null,
      unite_mesure: form.unite_mesure,
      unite: form.unite,
      ean: form.ean,
    };
    
    onSave(dataToSave);
    onClose();
  };

  const inputClass = "border border-gray-300 dark:border-gray-600 p-2 rounded-lg w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const sectionClass = "p-5 rounded-lg";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 z-10"
        >
          <X size={24} />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            {initialData ? "Modifier un article" : "Nouvel article"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations de base */}
            <div className={`${sectionClass} bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700`}>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                📦 Informations de base
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    SKU * <span className="text-gray-500 dark:text-gray-400">(ex: 700-2051534)</span>
                  </label>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    className={inputClass}
                    required
                    disabled={!!initialData}
                  />
                </div>

                <div>
                  <label className={labelClass}>Type de palette (TUS)</label>
                  <select
                    name="tus"
                    value={form.tus}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="FEU">FEU - Palette Europe (1200×800mm)</option>
                    <option value="FCH">FCH - Palette CHEP (1200×1000mm)</option>
                    <option value="DPH">DPH - Demi-palette (800×600mm)</option>
                    <option value="COU">COU - Couche</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Désignation</label>
                  <input
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="Description du produit"
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Code EAN/UPC</label>
                  <input
                    name="ean"
                    value={form.ean}
                    onChange={handleChange}
                    placeholder="Code barre international"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Poids */}
            <div className={`${sectionClass} bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                ⚖️ Poids d'un carton ({form.unite})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Poids net (kg)</label>
                  <input
                    name="poids_net"
                    type="number"
                    step="0.001"
                    value={form.poids_net}
                    onChange={handleChange}
                    placeholder="Ex: 12.5"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Poids brut (kg) *</label>
                  <input
                    name="poids_brut"
                    type="number"
                    step="0.001"
                    value={form.poids_brut}
                    onChange={handleChange}
                    placeholder="Ex: 13.2"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Dimensions du carton */}
            <div className={`${sectionClass} bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800`}>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                📏 Dimensions d'un carton ({form.unite_mesure})
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Longueur (mm)</label>
                  <input
                    name="longueur"
                    type="number"
                    step="0.01"
                    value={form.longueur}
                    onChange={handleChange}
                    placeholder="Ex: 400"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Largeur (mm)</label>
                  <input
                    name="largeur"
                    type="number"
                    step="0.01"
                    value={form.largeur}
                    onChange={handleChange}
                    placeholder="Ex: 300"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Hauteur (mm) *</label>
                  <input
                    name="hauteur"
                    type="number"
                    step="0.01"
                    value={form.hauteur}
                    onChange={handleChange}
                    placeholder="Ex: 200"
                    className={inputClass}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Hauteur d'un seul carton
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration palette */}
            <div className={`${sectionClass} bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800`}>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                🎯 Configuration palette
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Quantité par palette *</label>
                  <input
                    name="qty_per_pallet"
                    type="number"
                    value={form.qty_per_pallet}
                    onChange={handleChange}
                    placeholder="Ex: 80"
                    className={inputClass}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Nombre total de cartons sur une palette complète
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Nombre de couches *</label>
                  <input
                    name="nb_couches"
                    type="number"
                    value={form.nb_couches}
                    onChange={handleChange}
                    placeholder="Ex: 8"
                    className={inputClass}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Nombre d'étages de cartons empilés
                  </p>
                </div>
              </div>
            </div>

            {/* Calcul hauteur palette */}
            {hauteurPaletteCalculee > 0 && (
              <div className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 p-5 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={24} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      📐 Hauteur palette calculée
                    </h4>
                    <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                      <p>
                        <strong className="text-2xl text-blue-600 dark:text-blue-400">
                          {hauteurPaletteCalculee.toFixed(0)} mm
                        </strong>
                        {" "}({(hauteurPaletteCalculee / 1000).toFixed(2)} m)
                      </p>
                      <p className="text-blue-700 dark:text-blue-400 mt-2">
                        = Hauteur palette support ({HAUTEUR_PALETTE_SUPPORT} mm) 
                        + ({form.hauteur} mm × {form.nb_couches} couches)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gerbage */}
            <div className={`${sectionClass} bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800`}>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                📚 Paramètres de gerbage
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="stackable"
                    checked={form.stackable}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Produit gerbable (peut être empilé)
                  </label>
                </div>

                {form.stackable && (
                  <div>
                    <label className={labelClass}>Poids max supportable (kg)</label>
                    <input
                      name="max_stack_weight"
                      type="number"
                      step="0.1"
                      value={form.max_stack_weight}
                      onChange={handleChange}
                      placeholder="Ex: 600"
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Poids maximum que peut supporter cette palette en position de base
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium transition-colors shadow-sm"
              >
                {initialData ? "Modifier" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}