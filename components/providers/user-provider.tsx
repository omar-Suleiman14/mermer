"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CurrentUser = any; // You can import the Doc<"users"> type from convex later

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

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");

  return (
    <UserContext.Provider value={{ currentUser, isLoading: currentUser === undefined, clerkId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
