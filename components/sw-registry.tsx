"use client";

import { useEffect } from "react";

export function SwRegistry() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Non-critical: push notifications simply stay unavailable.
    });
  }, []);

  return null;
}
