"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";

interface AddToQueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
}

export function AddToQueueDrawer({ open, onOpenChange, clerkId }: AddToQueueDrawerProps) {
  const [search, setSearch] = useState("");
  const patients = useQuery(api.patients.searchPatients, clerkId ? { clerkId, search } : "skip");
  const addToQueue = useMutation(api.queue.addToQueue);

  async function handleAdd(patientId: Id<"patients">) {
    try {
      await addToQueue({ clerkId, patientId });
      toast.success("Patient added to queue");
      onOpenChange(false);
      setSearch("");
    } catch {
      toast.error("Failed to add to queue");
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Add Patient to Queue</DrawerTitle>
          <DrawerDescription>Search for a patient to add to today&apos;s queue.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
            />
          </div>
        </div>
        <div className="px-4 overflow-y-auto flex-1 space-y-1.5 pb-4">
          {patients === undefined ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : patients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No patients found</p>
          ) : (
            patients.map((p) => (
              <button
                key={p._id}
                onClick={() => handleAdd(p._id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#007AFF]">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-[#007AFF]">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.age}y · {p.phone}</p>
                </div>
                <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-[#007AFF] flex-shrink-0" />
              </button>
            ))
          )}
        </div>
        <DrawerFooter>
          <DrawerClose className="text-sm text-muted-foreground hover:text-foreground">Cancel</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
