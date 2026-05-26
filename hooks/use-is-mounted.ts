import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * A hook that returns true if the component has mounted on the client.
 * Uses `useSyncExternalStore` to avoid hydration mismatch errors without
 * causing the cascading renders associated with `useEffect(() => setMounted(true), [])`.
 */
export function useIsMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
