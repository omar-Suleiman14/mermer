"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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
  const detectorRef = useRef<ConnectionDetector | null>(null);

  useEffect(() => {
    const detector = new ConnectionDetector(convexUrl);
    detectorRef.current = detector;

    // Set initial status
    setStatus(detector.status);

    // Subscribe to changes
    const unsubscribe = detector.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Expose for debug in dev mode
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__connectionDetector = detector;
    }

    return () => {
      unsubscribe();
      detector.destroy();
      detectorRef.current = null;
    };
  }, [convexUrl]);

  const value = useMemo(
    () => ({
      status,
      pendingSyncCount,
      setPendingSyncCount,
      detector: detectorRef.current,
    }),
    [status, pendingSyncCount]
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
