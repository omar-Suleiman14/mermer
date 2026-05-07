"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  Camera,
  Upload,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";

interface VisitCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  appointmentId: Id<"appointments">;
  patientName: string;
  patientAge?: number;
  onComplete?: () => void;
}

export function VisitCompletionModal({
  open,
  onOpenChange,
  clerkId,
  appointmentId,
  patientName,
  patientAge,
  onComplete,
}: VisitCompletionModalProps) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateAppointment = useMutation(api.appointments.updateAppointment);

  const [rxFile, setRxFile] = useState<File | null>(null);
  const [rxPreviewUrl, setRxPreviewUrl] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  const rxInputRef = useRef<HTMLInputElement>(null);
  const extrasInputRef = useRef<HTMLInputElement>(null);

  const handleRxFile = useCallback((file: File) => {
    setRxFile(file);
    setRxPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleSave = async (skip = false) => {
    setIsSaving(true);
    try {
      let prescriptionImageId: Id<"_storage"> | undefined;
      const documentIds: Id<"_storage">[] = [];

      if (!skip && rxFile) {
        const rxUploadUrl = await generateUploadUrl();
        const rxRes = await fetch(rxUploadUrl, {
          method: "POST",
          headers: { "Content-Type": rxFile.type },
          body: rxFile,
        });
        const { storageId } = await rxRes.json();
        prescriptionImageId = storageId as Id<"_storage">;
      }

      for (const docFile of extraFiles) {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": docFile.type },
          body: docFile,
        });
        const { storageId } = await res.json();
        documentIds.push(storageId as Id<"_storage">);
      }

      await updateAppointment({
        clerkId,
        appointmentId,
        updates: {
          status: "completed",
          prescriptionImageId: prescriptionImageId || undefined,
          documentIds: documentIds.length > 0 ? documentIds : undefined,
        }
      });

      setDone(true);
      toast.success(skip ? "Visit recorded" : "Prescription photo saved");
      setTimeout(() => {
        onComplete?.();
        handleClose();
      }, 1100);
    } catch {
      toast.error("Failed to complete visit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setRxFile(null);
    setRxPreviewUrl(null);
    setExtraFiles([]);
    setDone(false);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 w-full sm:max-w-lg bg-[var(--background)] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold">Complete Visit</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {patientName} · Add prescription photo
                </p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Done */}
              {done && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-[#34c759]/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8 text-[#34c759]" />
                  </div>
                  <p className="font-semibold text-base">Visit Complete</p>
                  <p className="text-sm text-muted-foreground mt-1">Prescription saved to timeline</p>
                </motion.div>
              )}

              {!done && (
                <div className="space-y-4">
                  {/* Rx photo upload */}
                  {!rxPreviewUrl ? (
                    <div>
                      <p className="text-sm font-medium mb-3">Prescription Photo <span className="text-muted-foreground font-normal">(optional)</span></p>
                      <button
                        onClick={() => rxInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/4 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-[#007AFF]/10 transition-colors">
                          <Camera className="w-6 h-6 text-muted-foreground group-hover:text-[#007AFF]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Take photo or upload</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Saved directly to patient timeline</p>
                        </div>
                      </button>
                      <input
                        ref={rxInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRxFile(f); }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Prescription Photo</p>
                      <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 aspect-[3/4] max-h-48">
                        <img src={rxPreviewUrl} alt="Prescription" className="w-full h-full object-contain" />
                        <button
                          onClick={() => { setRxFile(null); setRxPreviewUrl(null); }}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Extra docs */}
                  <div>
                    <button
                      onClick={() => extrasInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-[#007AFF] hover:underline"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Attach lab results or documents
                    </button>
                    {extraFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {extraFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            {f.name}
                            <button
                              onClick={() => setExtraFiles((prev) => prev.filter((_, j) => j !== i))}
                              className="ml-auto text-red-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      ref={extrasInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setExtraFiles((prev) => [...prev, ...files]);
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => handleSave(true)}
                      className="flex-1 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => handleSave(false)}
                      disabled={isSaving}
                      className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <><IOSSpinner size={16} className="text-white" /> Saving…</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Save Visit</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
