"use client";

import { useEffect } from "react";

export function SwRegistry() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service Worker registration failed:", err);
    });
  }, []);

  return null;
}
