"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, AlertCircle } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MergePatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  sourcePatientId: Id<"patients">;
  sourcePatientName: string;
}

export function MergePatientModal({
  open,
  onOpenChange,
  clerkId,
  sourcePatientId,
  sourcePatientName,
}: MergePatientModalProps) {
  const { dir, lang } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<Id<"patients"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const searchResults = useQuery(
    api.patients.searchPatients,
    clerkId ? { clerkId, search } : "skip"
  );

  const mergePatients = useMutation(api.patients.mergePatients);

  const handleMerge = async () => {
    if (!selectedTarget) return;

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setLoading(true);
    try {
      await mergePatients({
        clerkId,
        sourcePatientId,
        targetPatientId: selectedTarget,
      });
      toast.success(
        lang === "ar"
          ? "تم دمج المريض بنجاح"
          : "Patient merged successfully"
      );
      onOpenChange(false);
      // Redirect to the target patient page
      router.push(`/dashboard/patients/${selectedTarget}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to merge patients");
    } finally {
      setLoading(false);
      setConfirmStep(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          dir={dir}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex-none flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">
                  {lang === "ar" ? "دمج مريض" : "Merge Patient"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "ar"
                    ? `دمج بيانات ${sourcePatientName} في مريض آخر`
                    : `Merge ${sourcePatientName}'s data into another patient`}
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-xl flex gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  {lang === "ar"
                    ? "الدمج لا رجعة فيه. سيتم نقل كل الزيارات والمواعيد إلى المريض الذي تختاره أدناه، وسيتم حذف السجل الحالي."
                    : "Merging is irreversible. All visits and appointments will be transferred to the selected patient below, and the current record will be deleted."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {lang === "ar" ? "ابحث عن المريض الآخر" : "Search target patient"}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute top-3 left-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === "ar" ? "الاسم أو رقم الهاتف..." : "Name or phone..."}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    dir={dir}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {searchResults === undefined ? (
                  <div className="flex justify-center py-4">
                    <IOSSpinner size={20} />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {lang === "ar" ? "لا توجد نتائج" : "No results found"}
                  </p>
                ) : (
                  searchResults
                    .filter((p) => p._id !== sourcePatientId)
                    .map((p) => (
                      <button
                        key={p._id}
                        onClick={() => {
                          setSelectedTarget(p._id);
                          setConfirmStep(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-start transition-colors ${
                          selectedTarget === p._id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-card border-border hover:border-primary/40"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs opacity-70 mt-0.5">{p.phone}</p>
                        </div>
                        {selectedTarget === p._id && (
                          <Check className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-none p-5 border-t border-border flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleMerge}
                disabled={!selectedTarget || loading}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex justify-center items-center gap-2 transition-colors ${
                  confirmStep ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
                }`}
              >
                {loading && <IOSSpinner size={16} className="text-white" />}
                {!loading && confirmStep ? (lang === "ar" ? "نعم، ادمج الآن" : "Yes, Merge Now") : (lang === "ar" ? "تأكيد الدمج" : "Confirm Merge")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
