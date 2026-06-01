import { useSyncExternalStore } from "react";

// ── Media query subscription ──────────────────────────────────────────────────

function subscribeDesktop(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getDesktopSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 640px)").matches;
}

function getServerSnapshot(): boolean {
  return false; // SSR always assumes mobile-first
}

/**
 * Returns `true` when the viewport is ≥ 640px (sm breakpoint).
 *
 * Uses `useSyncExternalStore` so the value is read synchronously on the
 * client, eliminating the one-frame flicker you'd get with `useState/useEffect`.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getServerSnapshot
  );
}
