import { Download, FileText, Image as ImageIcon } from "lucide-react";

interface StackedUnit {
  base_pallet: {
    sscc: string;
    sku: string;
    quantity: number;
    status: "full" | "partial";
    height_actual: number;
    weight_actual: number;
  };
  stacked_pallets: Array<{
    sscc: string;
    quantity: number;
    height_actual: number;
    weight_actual: number;
  }>;
  total_height: number;
  total_weight: number;
  dimensions: { l: number; w: number; h: number };
}

interface LoadingStats {
  totalPallets: number;
  totalWeight: number;
  totalVolume: number;
  volumeUtilization: number;
  stackedCount: number;
}

interface LoadingPlanExporterProps {
  stackedUnits: StackedUnit[];
  stats: LoadingStats;
  truckType: string;
  truck: { length: number; width: number; height: number };
  onExport?: (format: "json" | "csv" | "html") => void;
}

export default function LoadingPlanExporter({
  stackedUnits,
  stats,
  truckType,
  truck,
  onExport,
}: LoadingPlanExporterProps) {
  // Export JSON détaillé
  const exportJSON = () => {
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        truckType,
        truckDimensions: truck,
      },
      statistics: stats,
      loadingPlan: stackedUnits.map((unit, idx) => ({
        position: idx + 1,
        basePallet: {
          sscc: unit.base_pallet.sscc,
          sku: unit.base_pallet.sku,
          quantity: unit.base_pallet.quantity,
          status: unit.base_pallet.status,
          height: unit.base_pallet.height_actual,
          weight: unit.base_pallet.weight_actual,
        },
        stackedPallets: unit.stacked_pallets.map(p => ({
          sscc: p.sscc,
          quantity: p.quantity,
          height: p.height_actual,
          weight: p.weight_actual,
        })),
        totalHeight: unit.total_height,
        totalWeight: unit.total_weight,
        dimensions: unit.dimensions,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    downloadFile(blob, `plan-chargement-${Date.now()}.json`);
    onExport?.("json");
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "Position",
      "SSCC Base",
      "SKU",
      "Quantité Base",
      "Statut",
      "SSCC Gerbées",
      "Quantités Gerbées",
      "Hauteur Totale (m)",
      "Poids Total (kg)",
      "Longueur (m)",
      "Largeur (m)",
    ];

    const rows = stackedUnits.map((unit, idx) => [
      idx + 1,
      unit.base_pallet.sscc,
      unit.base_pallet.sku,
      unit.base_pallet.quantity,
      unit.base_pallet.status,
      unit.stacked_pallets.map(p => p.sscc).join("; "),
      unit.stacked_pallets.map(p => p.quantity).join("; "),
      unit.total_height.toFixed(2),
      unit.total_weight.toFixed(1),
      unit.dimensions.l.toFixed(2),
      unit.dimensions.w.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `plan-chargement-${Date.now()}.csv`);
    onExport?.("csv");
  };

  // Export HTML avec visualisation
  const exportHTML = () => {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan de Chargement - ${truckType}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #111827; margin-bottom: 0.5rem; }
    .subtitle { color: #6b7280; margin-bottom: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #f3f4f6; padding: 1rem; border-radius: 6px; }
    .stat-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: bold; color: #111827; }
    .truck-info { background: #dbeafe; padding: 1rem; border-radius: 6px; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th { background: #f3f4f6; padding: 0.75rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
    .status-full { color: #059669; font-weight: 500; }
    .status-partial { color: #ea580c; font-weight: 500; }
    .stacked-badge { background: #dcfce7; color: #166534; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    .footer { text-align: center; color: #6b7280; font-size: 0.875rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    @media print { body { padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Plan de Chargement</h1>
    <p class="subtitle">Généré le ${new Date().toLocaleString("fr-FR")}</p>

    <div class="truck-info">
      <strong>Type de camion:</strong> ${truckType}<br>
      <strong>Dimensions:</strong> ${truck.length}m × ${truck.width}m × ${truck.height}m
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total palettes</div>
        <div class="stat-value">${stats.totalPallets}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unités gerbées</div>
        <div class="stat-value">${stats.stackedCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Poids total</div>
        <div class="stat-value">${stats.totalWeight.toFixed(0)} kg</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Taux remplissage</div>
        <div class="stat-value">${stats.volumeUtilization.toFixed(1)}%</div>
      </div>
    </div>

    <h2 style="margin-bottom: 1rem;">Détail du chargement</h2>
    <table>
      <thead>
        <tr>
          <th>Pos.</th>
          <th>SSCC Base</th>
          <th>SKU</th>
          <th>Qté</th>
          <th>Statut</th>
          <th>Gerbage</th>
          <th>H. Tot. (m)</th>
          <th>Poids (kg)</th>
        </tr>
      </thead>
      <tbody>
        ${stackedUnits
          .map(
            (unit, idx) => `
          <tr>
            <td><strong>${idx + 1}</strong></td>
            <td>${unit.base_pallet.sscc}</td>
            <td>${unit.base_pallet.sku}</td>
            <td>${unit.base_pallet.quantity}</td>
            <td class="status-${unit.base_pallet.status}">
              ${unit.base_pallet.status === "full" ? "Pleine" : "Incomplète"}
            </td>
            <td>
              ${
                unit.stacked_pallets.length > 0
                  ? `<span class="stacked-badge">+${unit.stacked_pallets.length} palette(s)</span>`
                  : "-"
              }
            </td>
            <td>${unit.total_height.toFixed(2)}</td>
            <td>${unit.total_weight.toFixed(1)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    ${
      stackedUnits.some(u => u.stacked_pallets.length > 0)
        ? `
    <h2 style="margin-bottom: 1rem;">Détail du gerbage</h2>
    ${stackedUnits
      .filter(u => u.stacked_pallets.length > 0)
      .map(
        (unit, idx) => `
      <div style="background: #f9fafb; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
        <strong>Position ${stackedUnits.indexOf(unit) + 1} - ${unit.base_pallet.sscc}</strong>
        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
          ${unit.stacked_pallets
            .map(
              p => `
            <li style="margin: 0.25rem 0;">
              ${p.sscc} - ${p.quantity} unités (${p.height_actual.toFixed(2)}m, ${p.weight_actual.toFixed(1)}kg)
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `
      )
      .join("")}
    `
        : ""
    }

    <div class="footer">
      Document généré automatiquement par le système de chargement intelligent
    </div>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    downloadFile(blob, `plan-chargement-${Date.now()}.html`);
    onExport?.("html");
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Download size={20} />
        Exporter le plan de chargement
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={exportJSON}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText size={18} />
          <div className="text-left">
            <div className="font-medium text-sm">JSON</div>
            <div className="text-xs opacity-90">Données complètes</div>
          </div>
        </button>

        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileText size={18} />
          <div className="text-left">
            <div className="font-medium text-sm">CSV</div>
            <div className="text-xs opacity-90">Excel compatible</div>
          </div>
        </button>

        <button
          onClick={exportHTML}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <ImageIcon size={18} />
          <div className="text-left">
            <div className="font-medium text-sm">HTML</div>
            <div className="text-xs opacity-90">Rapport visuel</div>
          </div>
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Statistiques du chargement:</strong>
        </p>
        <ul className="text-xs text-gray-600 mt-2 space-y-1">
          <li>• {stats.totalPallets} palettes au total</li>
          <li>• {stats.stackedCount} unités avec gerbage</li>
          <li>• {stats.totalWeight.toFixed(0)} kg de poids total</li>
          <li>• {stats.volumeUtilization.toFixed(1)}% du volume utilisé</li>
        </ul>
      </div>
    </div>
  );
}