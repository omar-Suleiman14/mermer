"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, QrCode, CheckCircle2, RefreshCcw, Smartphone, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import Image from "next/image";

export function WhatsAppIntegration({ clinicId }: { clinicId: string }) {
  const { dir } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  // Poll for connection state if active but not open
  const creds = useQuery(api.whatsappQueries.getClinicEvolutionCreds, { clinicId: clinicId as any });
  const activateIntegration = useAction(api.evolution.activateIntegration);
  const getConnectionState = useAction(api.evolution.getConnectionState);

  const fetchState = async () => {
    if (!creds?.evolutionInstanceName) return;
    try {
      const res = await getConnectionState({ 
        clinicId: clinicId as any, 
        instanceName: creds.evolutionInstanceName 
      });
      if (res.status === "error") {
         setError(dir === "rtl" ? "خدمة الواتساب غير متاحة حالياً. يرجى استخدام الرسائل اليدوية." : "WhatsApp service is temporarily unavailable. Please use manual messages.");
      } else if (res.qrCode) {
         setQrCodeData(res.qrCode);
      }
    } catch (e) {
      setError(dir === "rtl" ? "تعذر الاتصال بخادم الواتساب." : "Could not connect to WhatsApp server.");
    }
  };

  // Poll every 5 seconds if connecting
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (creds?.isEvolutionActive && creds?.evolutionStatus !== "open") {
      fetchState();
      interval = setInterval(fetchState, 5000);
    }
    return () => clearInterval(interval);
  }, [creds?.isEvolutionActive, creds?.evolutionStatus, creds?.evolutionInstanceName]);

  const handleActivate = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await activateIntegration({ clinicId: clinicId as any });
      if (res && res.success === false) {
        setError(dir === "rtl" ? "فشل تفعيل الخدمة. خادم الواتساب قد يكون غير متصل." : "Failed to activate. The WhatsApp server might be offline.");
      }
    } catch (err: any) {
      setError(dir === "rtl" ? "فشل تفعيل الخدمة. خادم الواتساب قد يكون غير متصل." : "Failed to activate. The WhatsApp server might be offline.");
    } finally {
      setLoading(false);
    }
  };

  if (!creds) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="bg-card border border-border p-6 rounded-3xl space-y-6" dir={dir}>
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          {dir === "rtl" ? "الربط الآلي مع واتساب" : "Automated WhatsApp Integration"}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {dir === "rtl" 
            ? "قم بربط رقم عيادتك لإرسال تذكيرات المواعيد ورسائل الدور تلقائياً للمرضى." 
            : "Connect your clinic's number to send automated appointment reminders and queue updates."}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!creds.isEvolutionActive ? (
        <div className="bg-muted/30 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
          <QrCode className="w-12 h-12 text-muted-foreground opacity-50" />
          <div>
            <h3 className="font-semibold">{dir === "rtl" ? "الخدمة غير مفعلة" : "Service is not active"}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {dir === "rtl" ? "انقر أدناه للبدء في ربط رقم الواتساب الخاص بالعيادة." : "Click below to start connecting your clinic's WhatsApp number."}
            </p>
          </div>
          <button
            onClick={handleActivate}
            disabled={loading}
            className="h-10 px-6 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {dir === "rtl" ? "تفعيل الربط" : "Activate Integration"}
          </button>
        </div>
      ) : creds.evolutionStatus === "open" ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <div>
            <h3 className="font-bold text-emerald-700 dark:text-emerald-400">
              {dir === "rtl" ? "متصل بنجاح" : "Connected Successfully"}
            </h3>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80 mt-1">
              {dir === "rtl" ? "العيادة الآن ترسل الرسائل الآلية بنجاح." : "The clinic is now sending automated messages."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-border p-6 rounded-2xl flex flex-col items-center text-center space-y-6">
          <div>
            <h3 className="font-bold">{dir === "rtl" ? "امسح الرمز ضوئياً" : "Scan the QR Code"}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {dir === "rtl" 
                ? "افتح تطبيق واتساب على هاتف العيادة، اذهب إلى الأجهزة المرتبطة، وامسح هذا الرمز." 
                : "Open WhatsApp on the clinic's phone, go to Linked Devices, and scan this code."}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            {qrCodeData ? (
              <Image src={qrCodeData} alt="WhatsApp QR Code" width={200} height={200} className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
              </div>
            )}
          </div>
          
          <button
            onClick={fetchState}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <RefreshCcw className="w-4 h-4" />
            {dir === "rtl" ? "تحديث الرمز" : "Refresh Code"}
          </button>
        </div>
      )}
    </div>
  );
}
