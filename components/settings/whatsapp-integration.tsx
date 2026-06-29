"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, QrCode, CheckCircle2, RefreshCcw, RotateCcw, Smartphone, AlertTriangle } from "lucide-react";
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
  const disconnectIntegration = useAction(api.evolution.disconnectIntegration);
  const [resetting, setResetting] = useState(false);

  const fetchState = async () => {
    if (!creds?.evolutionInstanceName) return;
    try {
      const res = await getConnectionState({ 
        clinicId: clinicId as any, 
        instanceName: creds.evolutionInstanceName 
      });
      if (res.status === "error") {
         setError(dir === "rtl" ? "خدمة الواتساب غير متاحة حالياً. يرجى التأكد من عمل الخادم." : "WhatsApp server is unreachable. Please check the server status.");
      } else {
         setError("");
         if (res.qrCode) {
           setQrCodeData(res.qrCode);
         }
      }
    } catch (e) {
      setError(dir === "rtl" ? "تعذر الاتصال بخادم الواتساب." : "Could not connect to WhatsApp server.");
    }
  };

  // Check state on mount, poll every 5s if connecting, 15s if connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (creds?.isEvolutionActive) {
      fetchState();
      interval = setInterval(fetchState, creds.evolutionStatus === "open" ? 15000 : 5000);
    }
    return () => clearInterval(interval);
  }, [creds?.isEvolutionActive, creds?.evolutionStatus, creds?.evolutionInstanceName]);

  const handleActivate = async () => {
    // Prevent double-clicking from creating duplicate instances
    if (loading) return;
    try {
      setLoading(true);
      setError("");
      setQrCodeData(null);
      const res = await activateIntegration({ clinicId: clinicId as any });

      if (res && res.success === false) {
        setError(dir === "rtl" ? "فشل تفعيل الخدمة. خادم الواتساب قد يكون غير متصل." : "Failed to activate. The WhatsApp server might be offline.");
        return;
      }

      // Use the QR code returned immediately from activation (no need to wait for first poll)
      if (res && (res as any).qrCode) {
        setQrCodeData((res as any).qrCode);
      }
    } catch (err: any) {
      setError(dir === "rtl" ? "فشل تفعيل الخدمة. خادم الواتساب قد يكون غير متصل." : "Failed to activate. The WhatsApp server might be offline.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      setError("");
      setQrCodeData(null);
      await disconnectIntegration({ 
        clinicId: clinicId as any, 
        instanceName: creds?.evolutionInstanceName 
      });
    } catch (err: any) {
      setError(dir === "rtl" ? "فشل إعادة التعيين." : "Failed to reset.");
    } finally {
      setResetting(false);
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
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400">
              {dir === "rtl" ? "تعذر الاتصال بالخادم" : "Server Unreachable"}
            </h3>
            <p className="text-sm text-red-600/80 dark:text-red-500/80 mt-1 max-w-sm">
              {error}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={fetchState}
              disabled={loading}
              className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {dir === "rtl" ? "تحديث" : "Refresh"}
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-4 py-2 bg-transparent border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              {dir === "rtl" ? "إلغاء الربط" : "Disconnect"}
            </button>
          </div>
        </div>
      ) : creds.evolutionStatus === "open" ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <div>
            <h3 className="font-bold text-emerald-700 dark:text-emerald-400">
              {dir === "rtl" ? "متصل بنجاح" : "Connected Successfully"}
            </h3>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80 mt-1">
              {dir === "rtl" ? "العيادة الآن ترسل الرسائل الآلية بنجاح." : "The clinic is now sending automated messages."}
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {dir === "rtl" ? "إلغاء الربط" : "Disconnect"}
          </button>
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
          
          <div className="flex items-center gap-4">
            <button
              onClick={fetchState}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <RefreshCcw className="w-4 h-4" />
              {dir === "rtl" ? "تحديث الرمز" : "Refresh Code"}
            </button>
            <span className="text-border">|</span>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50 transition-colors"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {dir === "rtl" ? "إعادة المحاولة" : "Start Over"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
