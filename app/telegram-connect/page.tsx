"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * /telegram-connect?tg_id=<telegramUserId>&tg_username=<username>
 *
 * Opened as a Telegram Mini App (or normal browser redirect).
 * After Clerk auth, it saves the Telegram ID to Convex and closes.
 */
export default function TelegramConnectPage() {
  const { user, isLoaded } = useUser();
  const linkTelegram = useMutation(api.telegram.linkTelegram);

  const [state, setState] = useState<"loading" | "linking" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [doctorName, setDoctorName] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      // Not signed in — redirect to sign-in, preserving the query params
      const params = new URLSearchParams(window.location.search);
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/telegram-connect?" + params.toString())}`;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tgId = params.get("tg_id");

    if (!tgId) {
      setState("error");
      setErrorMsg("Missing Telegram ID. Please use the bot's Connect button.");
      return;
    }

    setState("linking");
    linkTelegram({ clerkId: user.id, telegramId: tgId })
      .then((res) => {
        setDoctorName(res.doctorName);
        setState("success");

        // Notify the bot via our API route so it can send the confirmation message
        fetch("/api/telegram/connected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId: tgId, doctorName: res.doctorName, clinicName: res.clinicName }),
        }).catch(() => {});

        // Auto-close Telegram Mini App after 2 s or redirect back to bot
        setTimeout(() => {
          if (typeof window !== "undefined") {
            if ((window as any).Telegram?.WebApp) {
              (window as any).Telegram.WebApp.close();
            }
            window.location.href = "https://t.me/Elliot_abot";
          }
        }, 2000);
      })
      .catch((err: Error) => {
        setState("error");
        setErrorMsg(err.message || "Failed to connect. Please try again.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  return (
    <>
      {/* Telegram Mini App SDK */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://telegram.org/js/telegram-web-app.js" />

      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "linear-gradient(135deg, #0d0d0d 0%, #111827 100%)",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "linear-gradient(135deg, #007AFF, #5AC8FA)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            boxShadow: "0 8px 32px rgba(0,122,255,0.4)",
          }}
        >
          <span style={{ fontSize: 36 }}>⚕️</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          ابن سينا × إليوت
        </h1>

        {state === "loading" && (
          <>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>جارٍ التحقق من الهوية…</p>
            <Spinner />
          </>
        )}

        {state === "linking" && (
          <>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>جارٍ ربط حسابك بإليوت…</p>
            <Spinner />
          </>
        )}

        {state === "success" && (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(52,199,89,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 28,
              }}
            >
              ✅
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              تم الربط بنجاح!
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, maxWidth: 280 }}>
              أهلاً دكتور {doctorName}! حسابك مرتبط الآن بـ إليوت. جاري إعادتك لتطبيق تيليجرام...
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,59,48,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 28,
              }}
            >
              ❌
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#ff3b30" }}>
              حدث خطأ
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, maxWidth: 280 }}>{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20,
                padding: "10px 24px",
                borderRadius: 12,
                background: "#007AFF",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              المحاولة مجدداً
            </button>
          </>
        )}
      </div>
    </>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        border: "3px solid rgba(255,255,255,0.15)",
        borderTop: "3px solid #007AFF",
        borderRadius: "50%",
        marginTop: 20,
        animation: "spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
