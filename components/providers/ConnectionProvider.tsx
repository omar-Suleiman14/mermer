"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import {
  ConnectionDetector,
  type ConnectionStatus,
} from "@/lib/offline/connectionDetector";

// ─── Context ────────────────────────────────────────────────────────────────

interface ConnectionContextType {
  /** Current connection status */
  status: ConnectionStatus;
  /** Number of pending sync operations */
  pendingSyncCount: number;
  /** Update pending count — called by sync engine */
  setPendingSyncCount: (count: number) => void;
  /** The underlying detector instance (for sync engine access) */
  detector: ConnectionDetector | null;
}

const ConnectionContext = createContext<ConnectionContextType>({
  status: "online",
  pendingSyncCount: 0,
  setPendingSyncCount: () => {},
  detector: null,
});

// ─── Provider ───────────────────────────────────────────────────────────────

interface ConnectionProviderProps {
  children: ReactNode;
  convexUrl: string;
}

export function ConnectionProvider({
  children,
  convexUrl,
}: ConnectionProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [detector, setDetector] = useState<ConnectionDetector | null>(null);

  useEffect(() => {
    // Ask the browser to protect IndexedDB from storage-pressure eviction —
    // queued offline clinical writes must not be silently deleted.
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      void navigator.storage.persist().then((granted) => {
        console.log(
          `[ConnectionProvider] Persistent storage ${granted ? "granted" : "not granted"}`
        );
      });
    }

    const det = new ConnectionDetector(convexUrl);

    // Set initial status
    setStatus(det.status);

    // Subscribe to changes
    const unsubscribe = det.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Expose for debug in dev mode
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__connectionDetector = det;
    }

    // Publish the detector to context consumers (triggers re-render)
    setDetector(det);

    return () => {
      unsubscribe();
      det.destroy();
      setDetector(null);
    };
  }, [convexUrl]);

  const value = useMemo(
    () => ({
      status,
      pendingSyncCount,
      setPendingSyncCount,
      detector,
    }),
    [status, pendingSyncCount, detector]
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Get the current connection status */
export function useConnectionStatus(): ConnectionStatus {
  return useContext(ConnectionContext).status;
}

/** Get the full connection context (status + pending count + detector) */
export function useConnection(): ConnectionContextType {
  return useContext(ConnectionContext);
}

/** Convenience: returns true when the app is offline */
export function useIsOffline(): boolean {
  return useContext(ConnectionContext).status === "offline";
}
