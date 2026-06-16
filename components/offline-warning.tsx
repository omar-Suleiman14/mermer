"use client";

import { useState, useEffect } from "react";
import { WifiOff, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineWarning() {
  const [isOffline, setIsOffline] = useState(false);
  const { lang, dir } = useI18n();

  useEffect(() => {
    // Check initial state
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white shadow-xl flex items-center justify-center p-3 sm:p-4 gap-3 border-b-4 border-red-700"
          dir={dir}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5 shrink-0" />
          </div>
          <div className="text-sm font-medium flex-1 max-w-4xl">
            {lang === "ar" ? (
              <p className="leading-relaxed">
                <strong className="text-base block mb-1">انقطع الاتصال بالإنترنت! ⚡️</strong>
                التطبيق يعمل الآن في وضع عدم الاتصال (Offline). يمكنك الاستمرار في العمل وإضافة المرضى والمواعيد بشكل طبيعي، وسيتم حفظ كل شيء. 
                <span className="font-bold underline bg-red-700 px-1.5 py-0.5 rounded mx-1 text-white">الرجاء عدم تحديث أو إغلاق الصفحة</span> 
                حتى يعود الإنترنت لضمان مزامنة البيانات بنجاح.
              </p>
            ) : (
              <p className="leading-relaxed">
                <strong className="text-base block mb-1">Connection Lost! ⚡️</strong>
                The app is now running in Offline mode. You can continue working, adding patients, and scheduling normally, and everything will be queued. 
                <span className="font-bold underline bg-red-700 px-1.5 py-0.5 rounded mx-1 text-white">Please DO NOT refresh or close the page</span> 
                until the connection is restored to sync your data.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
