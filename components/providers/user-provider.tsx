"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useConnectionStatus } from "@/components/providers/ConnectionProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CurrentUser = any; // You can import the Doc<"users"> type from convex later

const CACHE_KEY = "mermer_currentUser";

interface UserContextType {
  currentUser: CurrentUser | null | undefined;
  isLoading: boolean;
  clerkId: string;
}

const UserContext = createContext<UserContextType>({
  currentUser: undefined,
  isLoading: true,
  clerkId: "",
});

/**
 * Offline-aware user provider.
 *
 * When online, fetches from Convex and mirrors the result to localStorage.
 * When offline, returns the cached user so every downstream component
 * (dashboard, drawers, modals) keeps working without a spinner.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const connectionStatus = useConnectionStatus();
  const isOffline = connectionStatus === "offline";

  // Only query Convex when online
  const convexUser = useQuery(
    api.users.getCurrentUser,
    !isOffline && clerkId ? { clerkId } : "skip",
  );

  // Cached user from localStorage (loaded once on mount)
  const [cachedUser, setCachedUser] = useState<CurrentUser | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  });

  // Mirror convex user to localStorage whenever it arrives
  useEffect(() => {
    if (convexUser && convexUser._id) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(convexUser));
        setCachedUser(convexUser);
      } catch {
        // localStorage full or unavailable — ignore
      }
    }
  }, [convexUser]);

  // Determine the best available user object
  const currentUser = convexUser ?? cachedUser ?? undefined;
  const isLoading = currentUser === undefined;

  return (
    <UserContext.Provider value={{ currentUser, isLoading, clerkId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
