"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const getOrCreate = useMutation(api.users.getOrCreateUser);

  useEffect(() => {
    if (!isLoaded || !user) return;
    getOrCreate({
      clerkId: user.id,
      name: user.fullName ?? user.firstName ?? "Doctor",
      email: user.primaryEmailAddress?.emailAddress,
    }).catch(console.error);
  }, [isLoaded, user, getOrCreate]);

  return null;
}
