"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bot, CheckCircle2, Loader2, XCircle } from "lucide-react";

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

      <div className="flex flex-col min-h-[100dvh] items-center justify-center p-6 bg-muted/20">
        <div className="w-full max-w-sm bg-card border border-border rounded-[2rem] shadow-sm p-8 flex flex-col items-center text-center">
          
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-6">
            <Bot className="w-8 h-8 text-[#007AFF]" />
          </div>

          <h1 className="text-xl font-bold mb-2 text-foreground tracking-tight">
            Ibn Sina × Elliot
          </h1>

          {state === "loading" && (
            <div className="flex flex-col items-center gap-4 mt-4">
              <p className="text-sm text-muted-foreground">Verifying identity...</p>
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {state === "linking" && (
            <div className="flex flex-col items-center gap-4 mt-4">
              <p className="text-sm text-muted-foreground">Linking your account to Elliot...</p>
              <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center mt-4">
              <div className="w-12 h-12 rounded-full bg-[#34c759]/10 flex items-center justify-center mb-4 text-[#34c759]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold mb-2">Successfully Linked!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Welcome Dr. {doctorName}! Your account is now linked to Elliot. Redirecting you back to Telegram...
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center mt-4 w-full">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                <XCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold mb-2 text-red-500">An error occurred</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {errorMsg}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#007AFF] hover:bg-[#0062cc] text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
