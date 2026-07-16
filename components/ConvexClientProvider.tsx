"use client";

import { ReactNode, useEffect, useRef } from "react";
import { ConvexReactClient, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ConnectionProvider, useConnection } from "@/components/providers/ConnectionProvider";
import {
  initSyncEngine,
  destroySyncEngine,
  registerMutation,
} from "@/lib/offline/syncEngine";
import { api } from "@/convex/_generated/api";

const convexUrl = (process.env.NEXT_PUBLIC_CONVEX_URL || "").replace(/\/$/, "");
const convex = new ConvexReactClient(convexUrl);

/**
 * Initializes the sync engine and registers all offline-capable mutations.
 * Must be rendered inside both ConvexProvider and ConnectionProvider.
 */
function SyncEngineInitializer() {
  const { detector, setPendingSyncCount } = useConnection();
  const initialized = useRef(false);

  // Register mutation functions
  const createPatientMutation = useMutation(api.patients.createPatient);
  const updatePatientMutation = useMutation(api.patients.updatePatient);
  const createVisitMutation = useMutation(api.visits.createVisit);
  const addVisitFilesMutation = useMutation(api.visits.addVisitFiles);
  const createFollowUpMutation = useMutation(api.followUps.createFollowUp);
  const addManualAppointmentMutation = useMutation(api.appointments.addManualAppointment);
  const updateAppointmentMutation = useMutation(api.appointments.updateAppointment);
  const swapAppointmentsMutation = useMutation(api.appointments.swapAppointments);
  const addToQueueMutation = useMutation(api.queue.addToQueue);

  useEffect(() => {
    if (!detector || initialized.current) return;
    initialized.current = true;

    // Register all offline-capable mutations with the sync engine
    registerMutation("patients", "create", (args) =>
      createPatientMutation(args as Parameters<typeof createPatientMutation>[0])
    );
    registerMutation("patients", "update", (args) =>
      updatePatientMutation(args as Parameters<typeof updatePatientMutation>[0])
    );
    registerMutation("visits", "create", (args) =>
      createVisitMutation(args as Parameters<typeof createVisitMutation>[0])
    );
    registerMutation("visits", "update", (args) =>
      addVisitFilesMutation(args as Parameters<typeof addVisitFilesMutation>[0])
    );
    registerMutation("followUps", "create", (args) =>
      createFollowUpMutation(args as Parameters<typeof createFollowUpMutation>[0])
    );
    registerMutation("visits", "addManualAppointment", (args) =>
      addManualAppointmentMutation(args as Parameters<typeof addManualAppointmentMutation>[0])
    );
    registerMutation("visits", "updateAppointment", (args) =>
      updateAppointmentMutation(args as Parameters<typeof updateAppointmentMutation>[0])
    );
    registerMutation("visits", "swapAppointments", (args) =>
      swapAppointmentsMutation(args as Parameters<typeof swapAppointmentsMutation>[0])
    );
    registerMutation("queue", "create", (args) =>
      addToQueueMutation(args as Parameters<typeof addToQueueMutation>[0])
    );

    // Initialize the sync engine
    initSyncEngine({
      convexClient: convex,
      connectionDetector: detector,
      onPendingCountChange: setPendingSyncCount,
      onSyncComplete: () => {
        console.log("[SyncEngine] All changes synced successfully");
      },
      onEntryFailed: (entry) => {
        console.error(
          `[SyncEngine] Failed to sync: ${entry.table}.${entry.operation} — ${entry.error}`
        );
      },
    });

    return () => {
      destroySyncEngine();
      initialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detector]);

  return null;
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ConnectionProvider convexUrl={convexUrl}>
        <SyncEngineInitializer />
        {children}
      </ConnectionProvider>
    </ConvexProviderWithClerk>
  );
}
