/**
 * ConnectionDetector — robust network state detection.
 *
 * Goes beyond `navigator.onLine` (which only detects physical disconnection)
 * by pinging the Convex endpoint periodically to verify actual cloud reachability.
 *
 * States:
 *   "online"       — confirmed connection to Convex
 *   "offline"      — no network or Convex unreachable
 *   "reconnecting" — was offline, now trying to reconnect / syncing
 */

export type ConnectionStatus = "online" | "offline" | "reconnecting";

type Listener = (status: ConnectionStatus) => void;

const PING_INTERVAL_ONLINE = 30_000;   // 30s while online
const PING_INTERVAL_OFFLINE = 5_000;   // 5s while offline/reconnecting
const PING_TIMEOUT = 5_000;            // 5s timeout for ping
const MAX_BACKOFF = 60_000;            // Max 60s between retries

export class ConnectionDetector {
  private _status: ConnectionStatus = "online";
  private _listeners = new Set<Listener>();
  private _pingTimer: ReturnType<typeof setInterval> | null = null;
  private _backoffMs = PING_INTERVAL_OFFLINE;
  private _convexUrl: string;
  private _destroyed = false;

  constructor(convexUrl: string) {
    this._convexUrl = convexUrl.replace(/\/$/, "");
    this._init();
  }

  private _init() {
    if (typeof window === "undefined") return;

    // Set initial state from browser
    this._status = navigator.onLine ? "online" : "offline";

    // Browser events
    window.addEventListener("online", this._handleOnline);
    window.addEventListener("offline", this._handleOffline);

    // Start pinging
    this._startPinging();
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _setStatus(newStatus: ConnectionStatus) {
    if (this._status === newStatus) return;

    const oldStatus = this._status;
    this._status = newStatus;

    // Adjust ping interval based on new state
    this._restartPinging();

    // Reset backoff when coming back online
    if (newStatus === "online") {
      this._backoffMs = PING_INTERVAL_OFFLINE;
    }

    // Notify listeners
    for (const listener of this._listeners) {
      try {
        listener(newStatus);
      } catch (e) {
        console.error("[ConnectionDetector] listener error:", e);
      }
    }

    if (oldStatus !== newStatus) {
      console.log(`[ConnectionDetector] ${oldStatus} → ${newStatus}`);
    }
  }

  private _handleOnline = () => {
    // Browser says we're online — verify with a ping before confirming
    this._setStatus("reconnecting");
    void this._ping();
  };

  private _handleOffline = () => {
    this._setStatus("offline");
  };

  private async _ping(): Promise<boolean> {
    if (this._destroyed) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

      // Ping the Convex health endpoint — lightweight HEAD request
      const response = await fetch(`${this._convexUrl}/version`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // If we were offline/reconnecting, transition through reconnecting → online
        if (this._status === "offline") {
          this._setStatus("reconnecting");
          // Give sync engine a moment to start, then mark online
          // The sync engine will hold "reconnecting" state until queue is drained
        } else {
          this._setStatus("online");
        }
        return true;
      }

      this._setStatus("offline");
      return false;
    } catch {
      // Network error, CORS error, timeout, etc.
      if (this._status !== "offline") {
        this._setStatus("offline");
      }
      // Exponential backoff
      this._backoffMs = Math.min(this._backoffMs * 1.5, MAX_BACKOFF);
      return false;
    }
  }

  private _startPinging() {
    this._stopPinging();

    const interval = this._status === "online"
      ? PING_INTERVAL_ONLINE
      : this._backoffMs;

    this._pingTimer = setInterval(() => {
      void this._ping();
    }, interval);
  }

  private _restartPinging() {
    this._stopPinging();
    this._startPinging();
  }

  private _stopPinging() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  /** Mark as fully online — called by sync engine after queue is drained */
  markOnline() {
    this._setStatus("online");
  }

  /** Mark as reconnecting — called by sync engine when it starts draining */
  markReconnecting() {
    if (this._status !== "offline") {
      this._setStatus("reconnecting");
    }
  }

  /** Force offline state — used for testing */
  forceOffline() {
    this._setStatus("offline");
  }

  /** Force online state — used for testing */
  forceOnline() {
    this._setStatus("online");
  }

  destroy() {
    this._destroyed = true;
    this._stopPinging();
    this._listeners.clear();

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this._handleOnline);
      window.removeEventListener("offline", this._handleOffline);
    }
  }
}
