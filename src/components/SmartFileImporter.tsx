import { useState } from "react";
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface ImportResult {
  success: boolean;
  data: any[];
  errors: string[];
  warnings: string[];
  detectedColumns: string[];
}

interface SmartFileImporterProps {
  onImportComplete: (data: any[]) => void;
  expectedColumns: string[];
  columnMapping?: Record<string, string[]>; // Alias de colonnes
  fileTypes?: string[];
  title?: string;
  description?: string;
}

export default function SmartFileImporter({
  onImportComplete,
  expectedColumns,
  columnMapping = {},
  fileTypes = [".csv", ".xlsx", ".xls"],
  title = "Importer un fichier",
  description = "Glissez-déposez ou cliquez pour sélectionner",
}: SmartFileImporterProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Normaliser les noms de colonnes
  const normalizeColumnName = (col: string): string => {
    const normalized = col.toLowerCase().trim();
    
    // Chercher dans les mappings
    for (const [expected, aliases] of Object.entries(columnMapping)) {
      if (aliases.some(alias => normalized.includes(alias.toLowerCase()))) {
        return expected;
      }
    }

    // Chercher dans les colonnes attendues
    for (const expected of expectedColumns) {
      if (normalized.includes(expected.toLowerCase())) {
        return expected;
      }
    }

    return col;
  };

  // Parser CSV
  const parseCSV = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn("Erreurs CSV:", results.errors);
          }
          resolve(results.data);
        },
        error: (error) => reject(error),
      });
    });
  };

  // Parser Excel
  const parseExcel = async (file: File): Promise<any[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      cellDates: true,
      cellNF: true,
      sheetStubs: true,
    });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { 
      defval: null,
      raw: false 
    });

    return data;
  };

  // Valider et transformer les données
  const validateData = (rawData: any[]): ImportResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const detectedColumns: string[] = [];
    const transformedData: any[] = [];

    if (rawData.length === 0) {
      errors.push("Le fichier est vide");
      return { success: false, data: [], errors, warnings, detectedColumns };
    }

    // Détecter les colonnes
    const firstRow = rawData[0];
    const originalColumns = Object.keys(firstRow);
    
    // Mapping des colonnes
    const columnMap = new Map<string, string>();
    originalColumns.forEach(col => {
      const normalized = normalizeColumnName(col);
      columnMap.set(col, normalized);
      if (!detectedColumns.includes(normalized)) {
        detectedColumns.push(normalized);
      }
    });

    // Vérifier les colonnes manquantes
    const missingColumns = expectedColumns.filter(
      col => !detectedColumns.includes(col)
    );

    if (missingColumns.length > 0) {
      warnings.push(
        `Colonnes manquantes: ${missingColumns.join(", ")}`
      );
    }

    // Transformer les données
    rawData.forEach((row, idx) => {
      const transformedRow: any = {};
      let hasData = false;

      for (const [originalCol, normalizedCol] of columnMap.entries()) {
        const value = row[originalCol];
        
        // Ignorer les lignes vides
        if (value !== null && value !== undefined && value !== "") {
          hasData = true;
        }

        transformedRow[normalizedCol] = value;
      }

      if (hasData) {
        transformedRow._rowIndex = idx + 2; // +2 pour compter l'en-tête
        transformedData.push(transformedRow);
      }
    });

    return {
      success: errors.length === 0,
      data: transformedData,
      errors,
      warnings,
      detectedColumns,
    };
  };

  // Gérer l'import
  const handleImport = async (file: File) => {
    setImporting(true);
    setResult(null);
    setPreview([]);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rawData: any[] = [];

      if (ext === "csv") {
        rawData = await parseCSV(file);
      } else if (ext === "xlsx" || ext === "xls") {
        rawData = await parseExcel(file);
      } else {
        throw new Error("Format de fichier non supporté");
      }

      const validationResult = validateData(rawData);
      setResult(validationResult);
      setPreview(validationResult.data.slice(0, 5));

      if (validationResult.success) {
        onImportComplete(validationResult.data);
      }
    } catch (error: any) {
      setResult({
        success: false,
        data: [],
        errors: [error.message],
        warnings: [],
        detectedColumns: [],
      });
    } finally {
      setImporting(false);
    }
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleImport(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <Upload
          className={`mx-auto mb-3 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
          size={40}
        />
        <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
        <p className="text-xs text-gray-500 mb-3">{description}</p>
        <label className="cursor-pointer">
          <input
            type="file"
            accept={fileTypes.join(",")}
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            className="hidden"
            disabled={importing}
          />
          <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-block">
            {importing ? "Import en cours..." : "Sélectionner un fichier"}
          </span>
        </label>
        <p className="text-xs text-gray-400 mt-2">
          Formats acceptés: {fileTypes.join(", ")}
        </p>
      </div>

      {/* Résultat de l'import */}
      {result && (
        <div className="space-y-3">
          {/* Statut */}
          <div
            className={`flex items-start gap-3 p-4 rounded-lg ${
              result.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {result.success ? (
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            ) : (
              <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">
                {result.success
                  ? `✓ ${result.data.length} lignes importées avec succès`
                  : "Erreur lors de l'import"}
              </p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-700 mt-1">
                  • {err}
                </p>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
              <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="font-medium text-sm text-orange-900">Avertissements</p>
                {result.warnings.map((warn, i) => (
                  <p key={i} className="text-xs text-orange-700 mt-1">
                    • {warn}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Colonnes détectées */}
          {result.detectedColumns.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Colonnes détectées ({result.detectedColumns.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {result.detectedColumns.map((col, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 text-xs rounded ${
                      expectedColumns.includes(col)
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Aperçu des données */}
          {preview.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2">
                <p className="text-sm font-medium text-gray-700">
                  Aperçu (5 premières lignes)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {result.detectedColumns.slice(0, 8).map((col, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {result.detectedColumns.slice(0, 8).map((col, j) => (
                          <td key={j} className="px-3 py-2 text-gray-600">
                            {String(row[col] || "-").substring(0, 30)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}