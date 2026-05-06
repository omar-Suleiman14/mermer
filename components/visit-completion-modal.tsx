"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
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
  Loader2,
  Eye,
  Download,
} from "lucide-react";

interface VisitCompletionModalProps {
  open: boolean;
  onClose: () => void;
  clerkId: string;
  visitId: Id<"visits">;
  patientName: string;
  patientAge?: number;
  visitDate?: number;
  onComplete?: () => void;
}

// Image thresholding: isolates dark ink from paper background → transparent PNG
async function processRxPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and threshold — keep only dark pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Keep dark pixels (ink), make light pixels transparent
        if (lum > 160) {
          // Paper/background — transparent
          data[i + 3] = 0;
        } else {
          // Ink — keep as near-black
          data[i] = Math.min(lum * 0.3, 40);
          data[i + 1] = Math.min(lum * 0.3, 40);
          data[i + 2] = Math.min(lum * 0.3, 40);
          data[i + 3] = Math.max(0, Math.min(255, (160 - lum) * 2.2));
        }
      }

      ctx.putImageData(imageData, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to process image"));
      }, "image/png");
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Generate branded prescription PDF using jsPDF
async function generatePrescriptionPdf(opts: {
  inkBlob: Blob;
  doctorName: string;
  specialty?: string;
  credentials?: string;
  clinicName?: string;
  address?: string;
  phone?: string;
  workingHours?: string;
  logoUrl?: string | null;
  patientName: string;
  patientAge?: number;
  visitDate: number;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });

  const W = 210;
  const H = 297;
  const brandColor = [0, 99, 178] as [number, number, number]; // #0063B2

  // ─── Header band ───────────────────────────────────────────
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, W, 38, "F");

  // Logo (if provided)
  if (opts.logoUrl) {
    try {
      const logoData = await fetchImageAsDataUrl(opts.logoUrl);
      doc.addImage(logoData, "PNG", 10, 5, 28, 28);
    } catch {
      // skip logo if fails
    }
  }

  // Doctor name & info in header
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const nameX = opts.logoUrl ? 44 : 10;
  doc.text(opts.doctorName, nameX, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines: string[] = [];
  if (opts.specialty) lines.push(opts.specialty);
  if (opts.credentials) lines.push(opts.credentials);
  lines.forEach((line, i) => doc.text(line, nameX, 20 + i * 5));

  // Right-side clinic info
  doc.setFontSize(8);
  const rightLines: string[] = [];
  if (opts.clinicName) rightLines.push(opts.clinicName);
  if (opts.address) rightLines.push(opts.address);
  if (opts.phone) rightLines.push(`Tel: ${opts.phone}`);
  if (opts.workingHours) rightLines.push(opts.workingHours);
  rightLines.forEach((line, i) => {
    doc.text(line, W - 10, 10 + i * 4.5, { align: "right" });
  });

  // ─── Patient info bar ──────────────────────────────────────
  doc.setFillColor(240, 247, 255);
  doc.rect(0, 40, W, 14, "F");
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Patient: ${opts.patientName}`, 10, 49);
  if (opts.patientAge) {
    doc.text(`Age: ${opts.patientAge}`, 90, 49);
  }
  doc.text(
    `Date: ${new Date(opts.visitDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    W - 10,
    49,
    { align: "right" }
  );

  // ─── Rx symbol ─────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...brandColor);
  doc.text("Rx", 10, 72);
  doc.setDrawColor(...brandColor);
  doc.setLineWidth(0.5);
  doc.line(10, 74, W - 10, 74);

  // ─── Ink layer (processed prescription photo) ──────────────
  const inkDataUrl = await blobToDataUrl(opts.inkBlob);
  // Fit in body area
  const bodyY = 78;
  const maxH = H - bodyY - 30;
  doc.addImage(inkDataUrl, "PNG", 14, bodyY, W - 28, maxH);

  // ─── Footer ────────────────────────────────────────────────
  doc.setFillColor(...brandColor);
  doc.rect(0, H - 14, W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Generated by Ibn Sina · ibnsina.app", W / 2, H - 6, {
    align: "center",
  });

  return doc.output("blob");

  // helper inside closure
  async function fetchImageAsDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return blobToDataUrl(blob);
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

export function VisitCompletionModal({
  open,
  onClose,
  clerkId,
  visitId,
  patientName,
  patientAge,
  visitDate,
  onComplete,
}: VisitCompletionModalProps) {
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const logoUrlQuery = useQuery(api.users.getLogoUrl, clerkId ? { clerkId } : "skip");

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const addVisitFiles = useMutation(api.visits.addVisitFiles);

  const [phase, setPhase] = useState<"upload" | "processing" | "preview" | "done">("upload");
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [rxPreviewUrl, setRxPreviewUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const rxInputRef = useRef<HTMLInputElement>(null);
  const extrasInputRef = useRef<HTMLInputElement>(null);

  const handleRxFile = useCallback(async (file: File) => {
    setRxFile(file);
    setRxPreviewUrl(URL.createObjectURL(file));
    setPhase("processing");
    try {
      const processed = await processRxPhoto(file);
      setProcessedBlob(processed);
      setProcessedPreviewUrl(URL.createObjectURL(processed));
      setPhase("preview");
    } catch {
      toast.error("Failed to process prescription photo");
      setPhase("upload");
    }
  }, []);

  const handleSave = async (skip = false) => {
    setIsSaving(true);
    try {
      let prescriptionImageId: Id<"_storage"> | undefined;
      let prescriptionPdfId: Id<"_storage"> | undefined;
      const documentIds: Id<"_storage">[] = [];

      if (!skip && rxFile && processedBlob) {
        // Upload original rx image — storageId comes from response body, NOT the URL
        const rxUploadUrl = await generateUploadUrl();
        const rxRes = await fetch(rxUploadUrl, {
          method: "POST",
          headers: { "Content-Type": rxFile.type },
          body: rxFile,
        });
        const { storageId: rxStorageId } = await rxRes.json();
        prescriptionImageId = rxStorageId as Id<"_storage">;

        // Generate PDF
        const pdfBlob = await generatePrescriptionPdf({
          inkBlob: processedBlob!,
          doctorName: currentUser?.prescriptionDoctorName ?? currentUser?.name ?? "",
          specialty: currentUser?.prescriptionSpecialty ?? currentUser?.specialty,
          credentials: currentUser?.prescriptionCredentials ?? currentUser?.credentials,
          clinicName: currentUser?.prescriptionClinicName ?? currentUser?.clinicName,
          address: currentUser?.prescriptionAddress ?? currentUser?.clinicAddress,
          phone: currentUser?.prescriptionPhone ?? currentUser?.phone,
          workingHours: currentUser?.prescriptionWorkingHours ?? currentUser?.workingHours,
          logoUrl: logoUrlQuery ?? null,
          patientName,
          patientAge,
          visitDate: visitDate ?? Date.now(),
        });

        const pdfUploadUrl = await generateUploadUrl();
        const pdfRes = await fetch(pdfUploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: pdfBlob,
        });
        const { storageId: pdfStorageId } = await pdfRes.json();
        prescriptionPdfId = pdfStorageId as Id<"_storage">;
      }

      // Upload extra documents — storageId from response body
      for (const docFile of extraFiles) {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": docFile.type },
          body: docFile,
        });
        const { storageId: sid } = await res.json();
        documentIds.push(sid as Id<"_storage">);
      }

      if (prescriptionImageId || prescriptionPdfId || documentIds.length > 0) {
        await addVisitFiles({
          clerkId,
          visitId,
          prescriptionImageId,
          prescriptionPdfId,
          documentIds: documentIds.length > 0 ? documentIds : undefined,
        });
      }

      setPhase("done");
      toast.success(skip ? "Visit recorded" : "Prescription saved & PDF generated");
      setTimeout(() => {
        onComplete?.();
        handleClose();
      }, 1200);
    } catch (e) {
      toast.error("Failed to save visit files");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setPhase("upload");
    setRxFile(null);
    setRxPreviewUrl(null);
    setProcessedBlob(null);
    setProcessedPreviewUrl(null);
    setExtraFiles([]);
    onClose();
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 w-full sm:max-w-lg bg-[var(--background)] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Handle bar */}
            <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold">Complete Visit</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {patientName} · Upload prescription & documents
                </p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Done state */}
              {phase === "done" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-[#34c759]/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8 text-[#34c759]" />
                  </div>
                  <p className="font-semibold text-base">Visit Complete</p>
                  <p className="text-sm text-muted-foreground mt-1">Prescription PDF saved to timeline</p>
                </motion.div>
              )}

              {/* Upload phase */}
              {phase === "upload" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-3">Prescription Photo</p>
                    <button
                      onClick={() => rxInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/4 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-[#007AFF]/10 transition-colors">
                        <Camera className="w-6 h-6 text-muted-foreground group-hover:text-[#007AFF]" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Take photo or upload</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ink will be extracted automatically
                        </p>
                      </div>
                    </button>
                    <input
                      ref={rxInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleRxFile(f);
                      }}
                    />
                  </div>

                  {/* Extra docs */}
                  <div>
                    <p className="text-sm font-medium mb-2">Additional Documents <span className="text-muted-foreground font-normal">(optional)</span></p>
                    <button
                      onClick={() => extrasInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-[#007AFF] hover:underline"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Attach lab results, imaging, etc.
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

                  <button
                    onClick={() => handleSave(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip — no prescription to upload
                  </button>
                </div>
              )}

              {/* Processing */}
              {phase === "processing" && (
                <div className="flex flex-col items-center py-10 gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-[#007AFF] animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Processing prescription</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Isolating ink layer from paper background…
                    </p>
                  </div>
                </div>
              )}

              {/* Preview */}
              {phase === "preview" && processedPreviewUrl && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Original</p>
                      <div className="rounded-xl overflow-hidden border border-border bg-muted/30 aspect-[3/4]">
                        <img src={rxPreviewUrl!} alt="Original" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Processed</p>
                      <div className="rounded-xl overflow-hidden border border-border bg-[#007AFF]/5 aspect-[3/4]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e5e7eb'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e5e7eb'/%3E%3C/svg%3E\")" }}>
                        <img src={processedPreviewUrl} alt="Processed" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    ✓ Ink layer extracted · Will be embedded into branded PDF
                  </p>

                  {/* Extra docs */}
                  <div>
                    <button
                      onClick={() => extrasInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-[#007AFF] hover:underline"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Also attach extra documents
                    </button>
                    {extraFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {extraFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            {f.name}
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

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPhase("upload")}
                      className="flex-1 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      Retake
                    </button>
                    <button
                      onClick={() => handleSave(false)}
                      disabled={isSaving}
                      className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating PDF…
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Save & Generate PDF
                        </>
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
