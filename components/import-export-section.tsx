"use client";

import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, Download, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { useI18n } from "@/lib/i18n/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

interface ImportExportSectionProps {
  clerkId: string;
}

export function ImportExportSection({ clerkId }: ImportExportSectionProps) {
  const { t } = useI18n();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<"patients" | "medications">("patients");

  // Queries for export
  const allPatients = useQuery(api.patients.exportAllPatients, { clerkId });
  const allMedications = useQuery(api.clinicalOptions.exportAllMedications, { clerkId });

  // Mutations for import
  const batchCreatePatients = useMutation(api.patients.batchCreatePatients);
  const batchAddMedicationOptions = useMutation(api.clinicalOptions.batchAddMedicationOptions);

  // Import State
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patientFields = [
    { key: "name", label: t("settings.csvFieldPatientName") || "Patient Name (Required)" },
    { key: "age", label: t("settings.csvFieldAge") || "Age" },
    { key: "phone", label: t("settings.csvFieldPhone") || "Phone" },
    { key: "chronicConditions", label: t("settings.csvFieldConditions") || "Chronic Conditions (comma separated)" },
    { key: "notes", label: t("settings.csvFieldNotes") || "Notes" },
  ];

  const medicationFields = [
    { key: "name", label: t("settings.csvFieldMedName") || "Medication Name (Required)" },
  ];

  const handleExport = () => {
    try {
      if (allPatients && allPatients.length > 0) {
        const patientsCsv = Papa.unparse(allPatients.map(p => ({
          Name: p.name,
          Age: p.age,
          Phone: p.phone,
          "Chronic Conditions": p.chronicConditions.join(", "),
          Notes: p.notes || "",
          "Created At": new Date(p.createdAt).toISOString()
        })));
        downloadCsv(patientsCsv, "patients_export.csv");
      }

      if (allMedications && allMedications.length > 0) {
        const medsCsv = Papa.unparse(allMedications.map(m => ({ Name: m.name })));
        downloadCsv(medsCsv, "medications_export.csv");
      }

      toast.success(t("settings.exportSuccess") || "Data exported successfully");
    } catch {
      toast.error(t("settings.exportError") || "Failed to export data");
    }
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          setCsvData(results.data as Record<string, string>[]);
          const autoMap: Record<string, string> = {};
          const fields = importType === "patients" ? patientFields : medicationFields;
          fields.forEach(f => {
            const match = results.meta.fields?.find(
              h => h.toLowerCase().includes(f.key.toLowerCase()) || f.key.toLowerCase().includes(h.toLowerCase())
            );
            if (match) autoMap[f.key] = match;
          });
          setColumnMap(autoMap);
        }
      },
      error: () => toast.error(t("settings.csvParseError") || "Failed to parse CSV file"),
    });
    // reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const mapRowToEntity = (row: Record<string, string>) => {
    if (importType === "patients") {
      return {
        name: row[columnMap["name"]] || "Unknown",
        age: parseInt(row[columnMap["age"]]) || 0,
        phone: row[columnMap["phone"]] || "",
        chronicConditions: row[columnMap["chronicConditions"]]
          ? row[columnMap["chronicConditions"]].split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
        notes: row[columnMap["notes"]] || undefined,
      };
    } else {
      return { name: row[columnMap["name"]] || "Unknown" };
    }
  };

  const handleImportSingle = async (row: Record<string, string>, index: number) => {
    const entity = mapRowToEntity(row);
    if (!entity.name || entity.name === "Unknown") {
      toast.error(t("settings.csvNameRequired") || "Name is required");
      return;
    }
    try {
      if (importType === "patients") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await batchCreatePatients({ clerkId, patients: [entity] as any });
      } else {
        await batchAddMedicationOptions({ clerkId, medications: [entity.name] });
      }
      toast.success(t("settings.csvImportedOne") || "Imported 1 record");
      setCsvData(prev => prev.filter((_, i) => i !== index));
    } catch {
      toast.error(t("settings.csvImportFailed") || "Failed to import record");
    }
  };

  const handleImportAll = async () => {
    if (!columnMap["name"]) {
      toast.error(t("settings.csvMapNameFirst") || "Please map the Name column first");
      return;
    }
    setImporting(true);
    try {
      const entities = csvData.map(mapRowToEntity).filter(e => e.name && e.name !== "Unknown");
      if (importType === "patients") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await batchCreatePatients({ clerkId, patients: entities as any });
      } else {
        await batchAddMedicationOptions({ clerkId, medications: entities.map(e => e.name) });
      }
      toast.success(`${t("settings.csvImportedAll") || "Imported"} ${entities.length} ${t("settings.csvRecords") || "records"}`);
      setImportModalOpen(false);
      setCsvData([]);
      setColumnMap({});
    } catch {
      toast.error(t("settings.csvImportAllFailed") || "Failed to import records");
    } finally {
      setImporting(false);
    }
  };

  const blockClass = "bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-8";
  const rowClass = "flex items-center justify-between p-4 gap-4 transition-colors";
  const currentFields = importType === "patients" ? patientFields : medicationFields;

  return (
    <>
      <section>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 ms-4">
          {t("settings.dataManagement") || "Data Management"}
        </h3>
        <div className={blockClass}>
          <div className={rowClass + " border-b border-border"}>
            <div>
              <h4 className="text-sm font-medium">{t("settings.importData") || "Import Data"}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.importDataDesc") || "Import patients or medications from a CSV file"}</p>
            </div>
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors text-sm font-semibold flex items-center gap-2 shrink-0"
            >
              <Upload className="w-4 h-4" />
              {t("settings.importCsv") || "Import CSV"}
            </button>
          </div>

          <div className={rowClass + " bg-red-500/5"}>
            <div>
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400">{t("settings.exportData") || "Export Data"}</h4>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">{t("settings.exportDataDesc") || "Download all your patients and medications. Keep this file secure."}</p>
            </div>
            <button
              onClick={handleExport}
              disabled={!allPatients || !allMedications}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              <Download className="w-4 h-4" />
              {t("settings.exportBtn") || "Export"}
            </button>
          </div>
        </div>
      </section>

      <Drawer open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DrawerContent className="max-h-[90vh]">
          <div className="mx-auto w-full max-w-5xl overflow-hidden flex flex-col h-full">
            <DrawerHeader className="border-b border-border shrink-0 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <DrawerTitle>{t("settings.importData") || "Import Data"}</DrawerTitle>
                  <DrawerDescription className="mt-1">
                    {t("settings.csvModalSubtitle") || "Map columns and preview your data before importing"}
                  </DrawerDescription>
                </div>
              </div>
              <DrawerClose className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </DrawerClose>
            </DrawerHeader>

            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-muted/20">
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">{t("settings.csvStep1") || "1. Select Data Type & Upload CSV"}</h3>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <select
                      value={importType}
                      onChange={(e) => { setImportType(e.target.value as "patients" | "medications"); setColumnMap({}); setCsvData([]); setCsvHeaders([]); }}
                      className="p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto min-w-37.5"
                    >
                      <option value="patients">{t("settings.csvTypePatients") || "Patients"}</option>
                      <option value="medications">{t("settings.csvTypeMedications") || "Medications"}</option>
                    </select>
                    <div className="flex-1 w-full">
                      <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-background border border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg transition-colors text-sm font-medium w-full flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {csvHeaders.length > 0
                          ? (t("settings.csvUploadAnother") || "Upload a different CSV")
                          : (t("settings.csvUpload") || "Click to upload CSV")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                {csvHeaders.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-sm font-semibold mb-4">{t("settings.csvStep2") || "2. Map Columns"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentFields.map(field => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                          <select
                            value={columnMap[field.key] || ""}
                            onChange={(e) => setColumnMap({ ...columnMap, [field.key]: e.target.value })}
                            className="w-full p-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            <option value="">{t("settings.csvIgnore") || "-- Ignore --"}</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {csvData.length > 0 && (
                  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold">{t("settings.csvStep3") || "3. Preview & Import"}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{csvData.length} {t("settings.csvRows") || "rows"}</p>
                      </div>
                      <button
                        onClick={handleImportAll}
                        disabled={importing || !columnMap["name"]}
                        className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("settings.csvImportAll") || "Import All"} {csvData.length} {t("settings.csvRecords") || "Records"}
                      </button>
                    </div>
                    <div className="overflow-auto w-full">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 whitespace-nowrap">
                          <tr>
                            {currentFields.map(f => <th key={f.key} className="px-4 py-3 font-medium">{f.label}</th>)}
                            <th className="px-4 py-3 font-medium text-right">{t("settings.csvAction") || "Action"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {csvData.slice(0, 100).map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                              {currentFields.map(f => (
                                <td key={f.key} className="px-4 py-3 max-w-50 truncate">
                                  {row[columnMap[f.key]] || <span className="text-muted-foreground/50">—</span>}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleImportSingle(row, i)}
                                  className="px-3 py-1.5 bg-background border border-border hover:bg-muted rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                                >
                                  {t("settings.csvImportRow") || "Import Row"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 100 && (
                        <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
                          {t("settings.csvShowingFirst") || "Showing first 100 rows."} {t("settings.csvImportAll") || "Import All"} {t("settings.csvToImportAll") || "to import all"} {csvData.length} {t("settings.csvRows") || "rows"}.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
