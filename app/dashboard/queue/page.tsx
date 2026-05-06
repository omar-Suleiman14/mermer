"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { AddToQueueDrawer } from "@/components/add-to-queue-drawer";
import { VisitCompletionModal } from "@/components/visit-completion-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlusCircle, GripVertical, CheckCircle2, MessageCircle, Clock } from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type QueueItem = {
  _id: Id<"queue">;
  position: number;
  status: "waiting" | "in-progress" | "done";
  reminderSent: boolean;
  scheduledTime?: number;
  patient?: {
    _id: Id<"patients">;
    name: string;
    age: number;
    phone: string;
    chronicConditions: string[];
  } | null;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function SortableRow({
  item,
  onMarkDone,
  isNext,
  whatsappTemplate,
  onReminderSent,
}: {
  item: QueueItem;
  onMarkDone: (id: Id<"queue">) => void;
  isNext?: boolean;
  whatsappTemplate?: string;
  onReminderSent?: (id: Id<"queue">) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColor =
    item.status === "in-progress"
      ? "bg-[#34c759]/15 text-[#34c759] border-[#34c759]/30"
      : "bg-muted/60 text-muted-foreground border-border";

  const initials = (item.patient?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-card border rounded-xl transition-shadow ${
        item.status === "in-progress" ? "border-[#007AFF]/30 shadow-[0_0_0_1px_rgba(0,122,255,0.15)]" : "border-border"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none text-muted-foreground hover:text-foreground flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Position */}
      <span className="text-xs font-bold text-muted-foreground w-5 text-center flex-shrink-0">
        {item.position}
      </span>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#007AFF]">{initials}</span>
      </div>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/dashboard/patients/${item.patient?._id}`}
          className="font-semibold text-sm hover:text-[#007AFF] transition-colors truncate block"
        >
          {item.patient?.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>{item.patient?.age}y{item.patient?.chronicConditions?.[0] ? ` · ${item.patient.chronicConditions[0]}` : ""}</span>
          {item.scheduledTime && (
            <span className="flex items-center gap-0.5 text-[#007AFF] font-medium">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(item.scheduledTime)}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge className={`text-[10px] border ${statusColor} hidden sm:flex`}>
        {item.status === "in-progress" ? "● Now" : "Waiting"}
      </Badge>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isNext && (
          <button
            onClick={() => {
              if (item.reminderSent) return;
              const phone = encodeURIComponent(item.patient?.phone ?? "");
              const rawTemplate = whatsappTemplate || "Hi {{name}}, it's your turn soon. Please come over now.";
              const text = encodeURIComponent(rawTemplate.replace("{{name}}", item.patient?.name ?? ""));
              if (onReminderSent) onReminderSent(item._id);
              window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
            }}
            className={`flex items-center gap-1.5 text-[11px] font-semibold border px-2.5 py-1 rounded-lg transition-colors hidden sm:flex ${
              item.reminderSent
                ? "bg-muted/60 text-muted-foreground border-border/50 cursor-not-allowed"
                : "text-[#007AFF] border-[#007AFF]/30 hover:bg-[#007AFF]/10 cursor-pointer"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {item.reminderSent ? "Sent" : "Remind"}
          </button>
        )}
        <button
          onClick={() => onMarkDone(item._id)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34c759] border border-[#34c759]/30 px-2.5 py-1 rounded-lg hover:bg-[#34c759]/10 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Done
        </button>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const [addOpen, setAddOpen] = useState(false);

  // Visit completion modal state
  const [completionModal, setCompletionModal] = useState<{
    visitId: Id<"visits">;
    patientName: string;
    patientAge?: number;
  } | null>(null);

  const userQuery = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const rawQueue = useQuery(api.queue.getTodayQueue, clerkId ? { clerkId } : "skip");
  const markDone = useMutation(api.queue.markDone);
  const createVisit = useMutation(api.visits.createVisit);
  const reorder = useMutation(api.queue.reorderQueue);
  const markReminderSent = useMutation(api.queue.markReminderSent);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [localIds, setLocalIds] = useState<Id<"queue">[] | null>(null);

  const queue = rawQueue ?? [];
  const displayQueue = localIds
    ? localIds
        .map((id) => queue.find((q) => q._id === id))
        .filter(Boolean) as typeof queue
    : queue;

  if (
    rawQueue &&
    localIds &&
    JSON.stringify(localIds) !== JSON.stringify(rawQueue.map((q) => q._id))
  ) {
    setLocalIds(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = displayQueue.map((q) => q._id);
    const oldIdx = ids.indexOf(active.id as Id<"queue">);
    const newIdx = ids.indexOf(over.id as Id<"queue">);
    const newIds = arrayMove(ids, oldIdx, newIdx);

    setLocalIds(newIds);
    try {
      await reorder({ clerkId, orderedIds: newIds });
    } catch {
      toast.error("Failed to reorder");
      setLocalIds(null);
    }
  }

  async function handleMarkDone(queueId: Id<"queue">) {
    const item = displayQueue.find((q) => q._id === queueId);
    const patientId = item?.patient?._id;

    try {
      await markDone({ clerkId, queueId });

      // Create a visit record and open completion modal
      if (patientId) {
        const visitId = await createVisit({ clerkId, patientId });
        setCompletionModal({
          visitId,
          patientName: item?.patient?.name ?? "",
          patientAge: item?.patient?.age,
        });
      } else {
        toast.success("Patient marked as done");
      }
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Today's Queue" description="Drag to reorder · times cascade automatically">
        <button
          id="add-to-queue-btn"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add Patient
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {rawQueue === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : displayQueue.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-base font-medium mb-1">Queue is clear</p>
            <p className="text-sm text-muted-foreground mb-4">Add patients to start your day.</p>
            <button onClick={() => setAddOpen(true)} className="text-sm font-medium text-[#007AFF] hover:underline">
              Add first patient
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayQueue.map((q) => q._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-w-2xl">
                {displayQueue.map((item) => {
                  const isNext =
                    item.status === "waiting" &&
                    displayQueue.find((q) => q.status === "waiting")?._id === item._id;

                  return (
                    <SortableRow
                      key={item._id}
                      item={item as QueueItem}
                      onMarkDone={handleMarkDone}
                      isNext={isNext}
                      whatsappTemplate={userQuery?.whatsappTemplate}
                      onReminderSent={(queueId) =>
                        markReminderSent({ clerkId, queueId }).catch(console.error)
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <AddToQueueDrawer open={addOpen} onOpenChange={setAddOpen} clerkId={clerkId} />

      {completionModal && (
        <VisitCompletionModal
          open={!!completionModal}
          onClose={() => setCompletionModal(null)}
          clerkId={clerkId}
          visitId={completionModal.visitId}
          patientName={completionModal.patientName}
          patientAge={completionModal.patientAge}
          visitDate={Date.now()}
          onComplete={() => setCompletionModal(null)}
        />
      )}
    </div>
  );
}
