import { useState, useEffect } from "react";
import { X } from "lucide-react";

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

  const hauteurPaletteCalculee = form.hauteur && form.nb_couches 
    ? parseFloat(form.hauteur) * parseInt(form.nb_couches)
    : 0;

  useEffect(() => {
    if (initialData) {
      setForm({
        sku: initialData.sku || "",
        designation: initialData.designation || "",
        tus: initialData.tus || "FEU",
        poids_net: initialData.poids_net || "",
        poids_brut: initialData.poids_brut || "",
        longueur: initialData.longueur || "",
        largeur: initialData.largeur || "",
        hauteur: initialData.hauteur || "",
        unite_mesure: initialData.unite_mesure || "MM",
        unite: initialData.unite || "KG",
        ean: initialData.ean || "",
        qty_per_pallet: initialData.qty_per_pallet || "",
        nb_couches: initialData.nb_couches || "8",
        hauteur_couche: initialData.hauteur_couche || "",
        stackable: initialData.stackable || false,
        max_stack_weight: initialData.max_stack_weight || "",
      });
    }
  }, [initialData]);

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
      ...form,
      poids_net: form.poids_net ? parseFloat(form.poids_net) : null,
      poids_brut: form.poids_brut ? parseFloat(form.poids_brut) : null,
      longueur: form.longueur ? parseFloat(form.longueur) : null,
      largeur: form.largeur ? parseFloat(form.largeur) : null,
      hauteur: form.hauteur ? parseFloat(form.hauteur) : null,
      qty_per_pallet: form.qty_per_pallet ? parseInt(form.qty_per_pallet) : null,
      nb_couches: form.nb_couches ? parseInt(form.nb_couches) : null,
      hauteur_couche: hauteur_couche,
      max_stack_weight: form.max_stack_weight ? parseFloat(form.max_stack_weight) : null,
    };
    
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4">
          {initialData ? "Modifier un article" : "Nouvel article"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Informations de base</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="sku"
                placeholder="SKU (ex: 700-2051534) *"
                value={form.sku}
                onChange={handleChange}
                className="border p-2 rounded"
                required
              />
              <select
                name="tus"
                value={form.tus}
                onChange={handleChange}
                className="border p-2 rounded"
              >
                <option value="FEU">FEU - Palette Europe (1200×800mm)</option>
                <option value="FCH">FCH - Palette CHEP (1200×1000mm)</option>
                <option value="DPH">DPH - Demi-palette (800×600mm)</option>
                <option value="COU">COU - Couche</option>
              </select>
              <input
                name="designation"
                placeholder="Désignation"
                value={form.designation}
                onChange={handleChange}
                className="border p-2 rounded col-span-2"
              />
              <input
                name="ean"
                placeholder="Code EAN/UPC"
                value={form.ean}
                onChange={handleChange}
                className="border p-2 rounded col-span-2"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Poids d'un carton ({form.unite})</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="poids_net"
                placeholder="Poids net"
                type="number"
                step="0.01"
                value={form.poids_net}
                onChange={handleChange}
                className="border p-2 rounded"
              />
              <input
                name="poids_brut"
                placeholder="Poids brut"
                type="number"
                step="0.01"
                value={form.poids_brut}
                onChange={handleChange}
                className="border p-2 rounded"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Dimensions d'un carton ({form.unite_mesure})</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Longueur</label>
                <input
                  name="longueur"
                  placeholder="Longueur"
                  type="number"
                  step="0.01"
                  value={form.longueur}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Largeur</label>
                <input
                  name="largeur"
                  placeholder="Largeur"
                  type="number"
                  step="0.01"
                  value={form.largeur}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hauteur</label>
                <input
                  name="hauteur"
                  placeholder="Hauteur"
                  type="number"
                  step="0.01"
                  value={form.hauteur}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Configuration palette</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="qty_per_pallet"
                placeholder="Quantité par palette *"
                type="number"
                value={form.qty_per_pallet}
                onChange={handleChange}
                className="border p-2 rounded"
                required
              />
              <input
                name="nb_couches"
                placeholder="Nombre de couches"
                type="number"
                value={form.nb_couches}
                onChange={handleChange}
                className="border p-2 rounded"
              />
            </div>
            
            {hauteurPaletteCalculee > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-900">
                  <strong>Hauteur palette calculée :</strong> {hauteurPaletteCalculee.toFixed(0)} mm 
                  ({(hauteurPaletteCalculee / 1000).toFixed(2)} m)
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  = {form.nb_couches} couches × {form.hauteur} mm/carton
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Gerbage</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="stackable"
                  checked={form.stackable}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm">Peut être gerbé (empiler palettes incomplètes)</span>
              </label>
              
              {form.stackable && (
                <input
                  name="max_stack_weight"
                  placeholder="Poids max supportable (kg)"
                  type="number"
                  step="0.01"
                  value={form.max_stack_weight}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}