"use client";

import { useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Trash2, Plus, Upload, Download, FileText, Loader2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { IOSSpinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";
import Papa from "papaparse";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

type TabType = "medications" | "frequencies" | "notes";

export default function MedicationsPage() {
  const { user, isLoaded } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang, dir } = useI18n();
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<TabType>("medications");
  const [newItemName, setNewItemName] = useState("");

  const getTabName = (tab: TabType) => {
    if (!isAr) return tab;
    if (tab === "medications") return "الأدوية";
    if (tab === "frequencies") return "التكرار";
    return "الملاحظات";
  };

  const allClinicalOptions = useQuery(api.clinicalOptions.getAllClinicalOptions, clerkId ? { clerkId } : "skip");

  const addMedication = useMutation(api.clinicalOptions.addMedicationOption);
  const addFrequency = useMutation(api.clinicalOptions.addFrequencyOption);
  const addNote = useMutation(api.clinicalOptions.addNoteOption);

  const deleteMedication = useMutation(api.clinicalOptions.deleteMedicationOption);
  const deleteFrequency = useMutation(api.clinicalOptions.deleteFrequencyOption);
  const deleteNote = useMutation(api.clinicalOptions.deleteNoteOption);

  const batchAddMedications = useMutation(api.clinicalOptions.batchAddMedicationOptions);
  const batchAddFrequencies = useMutation(api.clinicalOptions.batchAddFrequencyOptions);
  const batchAddNotes = useMutation(api.clinicalOptions.batchAddNoteOptions);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    try {
      if (activeTab === "medications") await addMedication({ clerkId, name });
      else if (activeTab === "frequencies") await addFrequency({ clerkId, name });
      else if (activeTab === "notes") await addNote({ clerkId, name });
      setNewItemName("");
    } catch {
      toast.error(t("common.error") || "Error adding item");
    }
  };

  const handleDelete = async (id: any) => {
    try {
      if (activeTab === "medications") await deleteMedication({ clerkId, id });
      else if (activeTab === "frequencies") await deleteFrequency({ clerkId, id });
      else if (activeTab === "notes") await deleteNote({ clerkId, id });
    } catch {
      toast.error(t("common.error") || "Error deleting item");
    }
  };

  const handleExport = () => {
    if (!allClinicalOptions) return;
    try {
      const data = allClinicalOptions[activeTab] || [];
      if (data.length === 0) {
        toast.info(t("settings.noDataToExport") || "No data to export");
        return;
      }
      const csv = Papa.unparse(data.map(d => ({ Name: d.name })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${activeTab}_export.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("settings.exportSuccess") || "Data exported successfully");
    } catch {
      toast.error(t("settings.exportError") || "Failed to export data");
    }
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
          const match = results.meta.fields.find(
            h => h.toLowerCase().includes("name")
          );
          if (match) autoMap["name"] = match;
          setColumnMap(autoMap);
        }
      },
      error: () => toast.error(t("settings.csvParseError") || "Failed to parse CSV file"),
    });
    e.target.value = "";
  };

  const handleImportAll = async () => {
    if (!columnMap["name"]) {
      toast.error(t("settings.csvMapNameFirst") || "Please map the Name column first");
      return;
    }
    setImporting(true);
    try {
      const names = csvData
        .map(row => row[columnMap["name"]]?.trim())
        .filter(Boolean);

      if (names.length === 0) {
        toast.error(isAr ? "لم يتم العثور على أسماء صحيحة" : "No valid names found");
        return;
      }

      if (activeTab === "medications") {
        await batchAddMedications({ clerkId, medications: names });
      } else if (activeTab === "frequencies") {
        await batchAddFrequencies({ clerkId, frequencies: names });
      } else if (activeTab === "notes") {
        await batchAddNotes({ clerkId, notes: names });
      }
      toast.success(`${t("settings.csvImportedAll") || "Imported"} ${names.length} ${t("settings.csvRecords") || "records"}`);
      setImportModalOpen(false);
      setCsvData([]);
      setColumnMap({});
    } catch {
      toast.error(t("settings.csvImportAllFailed") || "Failed to import records");
    } finally {
      setImporting(false);
    }
  };

  if (!isLoaded || !allClinicalOptions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <IOSSpinner size={32} />
      </div>
    );
  }

  const items = allClinicalOptions[activeTab] || [];

  return (
    <div className="flex flex-col h-full bg-muted/20" suppressHydrationWarning>
      <PageHeader 
        title={t("nav.medications") || "Medications"} 
        description={t("settings.importDataDesc") || "Manage your medications, frequencies and notes"} 
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-4xl mx-auto w-full pb-20">
        
        {/* Tabs */}
        <div className="flex bg-card p-1 rounded-xl shadow-sm mb-6 w-full max-w-md mx-auto">
          {(["medications", "frequencies", "notes"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors capitalize ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {getTabName(tab)}
            </button>
          ))}
        </div>

        {/* Header with actions */}
        <div className="flex items-center justify-between mb-4 flex-col sm:flex-row gap-4">
          <form onSubmit={handleAdd} className="flex gap-2 w-full sm:w-auto flex-1">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={isAr ? `إضافة ${activeTab === 'medications' ? 'دواء' : activeTab === 'frequencies' ? 'تكرار' : 'ملاحظة'} جديد...` : `Add new ${activeTab.slice(0, -1)}...`}
              className="flex-1 p-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              {isAr ? "إضافة" : "Add"}
            </button>
          </form>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setCsvData([]); setColumnMap({}); setCsvHeaders([]); setImportModalOpen(true); }}
              className="flex-1 sm:flex-none px-4 py-2 bg-background border border-border hover:bg-muted rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isAr ? "استيراد CSV" : "Import CSV"}
            </button>
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none px-4 py-2 bg-background border border-border hover:bg-muted rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isAr ? "تصدير CSV" : "Export CSV"}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {isAr ? `لا توجد ${getTabName(activeTab)} مضافة. أضف واحداً بالأعلى أو استورد ملف CSV.` : `No ${activeTab} found. Add one above or import a CSV.`}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-medium">{item.name}</span>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Drawer */}
      <Drawer open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DrawerContent className="max-h-[90vh]">
          <div className="mx-auto w-full max-w-5xl overflow-hidden flex flex-col h-full">
            <DrawerHeader className="border-b border-border shrink-0 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left" dir={dir}>
                  <DrawerTitle>{isAr ? `استيراد ` : `Import `}{getTabName(activeTab)}</DrawerTitle>
                  <DrawerDescription className="mt-1">
                    {isAr ? `قم برفع ملف CSV يحتوي على ${getTabName(activeTab)} الخاصة بك` : `Upload a CSV file containing your ${activeTab}`}
                  </DrawerDescription>
                </div>
              </div>
              <DrawerClose className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </DrawerClose>
            </DrawerHeader>

            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-muted/20">
              <div className="space-y-6" dir={dir}>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">{isAr ? "١. رفع ملف CSV" : "1. Upload CSV"}</h3>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1 w-full">
                      <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-background border border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg transition-colors text-sm font-medium w-full flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {csvHeaders.length > 0 ? (isAr ? "رفع ملف مختلف" : "Upload a different CSV") : (isAr ? "اضغط لرفع ملف CSV" : "Click to upload CSV")}
                      </button>
                    </div>
                  </div>
                </div>

                {csvHeaders.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold mb-4">{isAr ? "٢. ربط الأعمدة" : "2. Map Columns"}</h3>
                    <div className="space-y-1.5 max-w-xs">
                      <label className="text-xs font-medium text-muted-foreground">{isAr ? "عمود الاسم" : "Name Column"}</label>
                      <select
                        value={columnMap["name"] || ""}
                        onChange={(e) => setColumnMap({ name: e.target.value })}
                        className="w-full p-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">{isAr ? "-- تجاهل --" : "-- Ignore --"}</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {csvData.length > 0 && (
                  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{isAr ? "٣. معاينة واستيراد" : "3. Preview & Import"}</h3>
                        <p className="text-xs text-muted-foreground">{csvData.length} {isAr ? "صفوف" : "rows"}</p>
                      </div>
                      <button
                        onClick={handleImportAll}
                        disabled={importing || !columnMap["name"]}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isAr ? "استيراد الكل" : "Import All"}
                      </button>
                    </div>
                    <div className="overflow-auto max-h-60">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className={`px-4 py-3 font-medium ${isAr ? "text-right" : "text-left"}`}>{isAr ? "الاسم" : "Name"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {csvData.slice(0, 50).map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className={`px-4 py-3 truncate ${isAr ? "text-right" : "text-left"}`}>{row[columnMap["name"]] || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 50 && (
                        <div className="p-4 text-center text-sm text-muted-foreground border-t border-border">
                          {isAr ? "عرض أول 50 صف." : "Showing first 50 rows."}
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
    </div>
  );
}
